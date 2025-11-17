# src/inference_service/main.py
import cv2
import time
import os
import json
import threading
import pika
import requests
import numpy as np
from flask import Flask, Response
from ultralytics import YOLO
from flask_cors import CORS

# Adiciona o diretório raiz ao path para encontrar o 'config'
import sys
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(project_root)
from config import settings

# --- Variáveis Globais de Threads ---
# Lock para o frame anotado (para o stream Flask)
data_lock = threading.Lock()
latest_annotated_frame = None

# Lock para o frame bruto (lido do capture_service)
frame_lock = threading.Lock()
latest_raw_frame = None       # O frame mais recente do capture_service
video_capture_client = None   # O objeto cv2.VideoCapture

# --- Variáveis de Configuração ---
MODEL_PATH = settings.MODEL_PATH
VIDEO_STREAM_URL = settings.CAPTURE_SERVICE_URL
RABBITMQ_HOST = settings.RABBITMQ_HOST
QUEUE_NAME = settings.RABBITMQ_QUEUE
ZONA_DE_DECISAO_X = settings.ZONA_DE_DECISAO_X

# --- Variáveis de Estado da IA ---
latest_detections = []
ids_ja_processados = set()
avg_processing_time_ms = 0

NESTJS_HEARTBEAT_URL = os.getenv("NESTJS_HEARTBEAT_URL", "http://localhost:3001/stats/heartbeat")
NESTJS_API_URL = os.getenv("NESTJS_API_URL", "http://localhost:3001/detections") # Se você usar essa var em enviar_deteccao_para_backend
# --- Funções de Comunicação (Sem alteração) ---

def enviar_deteccao_para_backend(dados_deteccao):
    try:
        class_name = dados_deteccao["objeto_detectado"]
        categoria_map = {"Rock": "A", "Paper": "B", "Scissors": "C"}
        status_map = {"Rock": "Pedra (Cat A)", "Paper": "Papel (Cat B)", "Scissors": "Tesoura (Cat C)"}

        dto_para_nest = {
            "type": class_name,
            "category": categoria_map.get(class_name, "UNCLASSIFIED"),
            "confidence": float(f"{dados_deteccao['confidence']:.2f}"),
            "status": status_map.get(class_name, "N/A")
        }

        print(f" [web] Enviando para NestJS: {dto_para_nest}")
        response = requests.post(NESTJS_API_URL, json=dto_para_nest, timeout=2)
        
        if response.status_code == 201:
            print(f" [web] SUCESSO: Detecção enviada para NestJS: {dto_para_nest['type']}")
        else:
            print(f" [web] FALHA: Erro ao enviar para NestJS: {response.status_code} {response.text}")

    except requests.exceptions.RequestException as e:
        print(f" [web] ERRO DE REDE: Não foi possível conectar com a API NestJS: {e}")
    except Exception as e:
        print(f" [web] ERRO INESPERADO: Falha ao enviar detecção: {e}")

def publicar_decisao(channel, mensagem_json):
    try:
        channel.basic_publish(
            exchange='',
            routing_key=QUEUE_NAME,
            body=mensagem_json,
            properties=pika.BasicProperties(delivery_mode=2)
        )
        print(f" [mq] Publicado: {mensagem_json}")
    except Exception as e:
        print(f" [mq] Erro ao publicar: {e}")

def send_heartbeat():
    global avg_processing_time_ms
    while True:
        try:
            payload = {
                "service": "ai",
                "status": "online",
                "modelName": os.path.basename(MODEL_PATH),
                "processingTimeMs": int(avg_processing_time_ms)
            }
            requests.post(NESTJS_HEARTBEAT_URL, json=payload, timeout=2)
            print(" [web] Pulso de vida da IA enviado para NestJS.")
        except Exception as e:
            print(f" [web] Falha ao enviar pulso de vida da IA: {e}")
        
        time.sleep(10)

# --- THREAD 1: O LEITOR DE FRAMES (MELHORADO!) ---
def frame_reader_loop():
    """
    Thread dedicado a ler o stream de vídeo.
    Sua única função é ler da rede e atualizar 'latest_raw_frame'.
    Isso evita o erro 'Expected boundary' por ler rápido o suficiente.
    """
    global latest_raw_frame, video_capture_client
    print(f" [capture] Conectando ao stream de vídeo: {VIDEO_STREAM_URL}")
    
    # Tenta conectar
    retry_count = 0
    while True:
        try:
            video_capture_client = cv2.VideoCapture(VIDEO_STREAM_URL)
            if video_capture_client.isOpened():
                print(f" [capture] ✓ Conexão de vídeo estabelecida com sucesso!")
                print(f" [capture] Propriedades: Width={video_capture_client.get(cv2.CAP_PROP_FRAME_WIDTH)}, "
                      f"Height={video_capture_client.get(cv2.CAP_PROP_FRAME_HEIGHT)}")
                retry_count = 0
                break
            else:
                retry_count += 1
                print(f" [capture] ✗ Falha ao conectar (tentativa {retry_count}). Verificando URL: {VIDEO_STREAM_URL}")
        except Exception as e:
            retry_count += 1
            print(f" [capture] ✗ Erro ao conectar: {e} (tentativa {retry_count})")
        
        print(f" [capture] Tentando novamente em 5s...")
        time.sleep(5)

    frames_read = 0
    while True:
        try:
            success, frame = video_capture_client.read()
            if not success:
                print(" [capture] ⚠ Perda de stream. Tentando reconectar...")
                video_capture_client.release()
                time.sleep(2) # Espera um pouco
                
                # Tenta reabrir a conexão
                video_capture_client = cv2.VideoCapture(VIDEO_STREAM_URL)
                if not video_capture_client.isOpened():
                    print(" [capture] ✗ Reconexão falhou. Tentando novamente em 5s...")
                    time.sleep(5)
                else:
                    print(" [capture] ✓ Reconexão bem-sucedida!")
                continue
            
            # Se teve sucesso, armazena o frame mais recente
            frames_read += 1
            with frame_lock:
                latest_raw_frame = frame.copy()
            
            if frames_read % 100 == 0:  # Log a cada 100 frames
                print(f" [capture] ✓ {frames_read} frames lidos com sucesso")
                
        except Exception as e:
            print(f" [capture] ✗ Erro ao ler frame: {e}")
            time.sleep(1)

# --- THREAD 2: O LOOP DE INFERÊNCIA (MODIFICADO) ---
def inference_tracking_loop():
    """
    Thread dedicado a rodar a IA.
    Não lê mais do video, apenas pega o 'latest_raw_frame' e processa.
    """
    global latest_annotated_frame, latest_detections, ids_ja_processados, avg_processing_time_ms

    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()
        channel.queue_declare(queue=QUEUE_NAME, durable=True)
        print(f" [mq] Conectado ao RabbitMQ em {RABBITMQ_HOST}")
    except Exception as e:
        print(f" [mq] Erro fatal: Não foi possível conectar ao RabbitMQ: {e}")
        return

    model = YOLO(MODEL_PATH)
    
    # Pega a resolução (vamos assumir 640x480, mas idealmente viria do frame)
    frame_height, frame_width = 480, 640 
    
    processing_times = []
    
    print(" [ia] Loop de inferência aguardando o primeiro frame do leitor...")
    frames_processed = 0
    while True:
        # 1. Pega o frame mais recente do Thread A
        with frame_lock:
            if latest_raw_frame is None:
                if frames_processed == 0:
                    print(" [ia] ⏳ Aguardando primeiro frame do capture-service...")
                time.sleep(0.5) # Espera o reader_loop pegar o primeiro frame
                continue
            frame = latest_raw_frame.copy()
            
            # Atualiza a resolução dinamicamente
            if frame_height != frame.shape[0] or frame_width != frame.shape[1]:
                frame_height, frame_width = frame.shape[0], frame.shape[1]
                print(f" [ia] ✓ Resolução do frame detectada: {frame_width}x{frame_height}")
            
            if frames_processed == 0:
                print(" [ia] ✓ Primeiro frame recebido! Iniciando processamento...")

        start_time = time.time()
        
        # 2. Processa o frame (sem alteração daqui para baixo)
        results = model.track(frame, persist=True, conf=0.5, verbose=False)
        
        annotated_frame = results[0].plot()
        detections_this_frame = []
        
        if results[0].boxes.id is not None:
            boxes = results[0].boxes.xyxy.cpu()
            track_ids = results[0].boxes.id.int().cpu().tolist()
            confs = results[0].boxes.conf.cpu().tolist()
            clss = results[0].boxes.cls.int().cpu().tolist()

            for box, track_id, conf, cls_id in zip(boxes, track_ids, confs, clss):
                center_x = int((box[0] + box[2]) / 2)
                class_name = model.names[cls_id]
                
                detections_this_frame.append(f"ID {track_id}: {class_name} ({conf:.2f})")

                if center_x > ZONA_DE_DECISAO_X and track_id not in ids_ja_processados:
                    print(f" [ia] Objeto ID {track_id} ({class_name}) cruzou a zona de decisão.")

                    mensagem_web = {
                        "track_id": track_id,
                        "objeto_detectado": class_name,
                        "confidence": conf 
                    }
                    enviar_deteccao_para_backend(mensagem_web)
                    
                    decisao_hardware = settings.DECISION_MAP.get(class_name, "nenhuma")
                    if decisao_hardware != "nenhuma":
                        mensagem_hardware = {
                            "track_id": track_id,
                            "objeto_detectado": class_name,
                            "decisao_direcao": decisao_hardware,
                            "timestamp": time.time()
                        }
                        publicar_decisao(channel, json.dumps(mensagem_hardware))
                    else:
                        print(f" [ia] Nenhuma ação de hardware definida para '{class_name}'.")

                    ids_ja_processados.add(track_id)
        
        # Cálculo do Tempo de Processamento
        end_time = time.time()
        loop_time_ms = (end_time - start_time) * 1000
        processing_times.append(loop_time_ms)
        if len(processing_times) > 50:
            processing_times.pop(0)
            
        avg_processing_time_ms = sum(processing_times) / len(processing_times)

        # Atualiza o frame anotado para o servidor Flask
        frames_processed += 1
        with data_lock:
            latest_detections = detections_this_frame
            ret, buffer = cv2.imencode('.jpg', annotated_frame)
            if ret:
                latest_annotated_frame = buffer.tobytes()
                if frames_processed == 1:
                    print(" [ia] ✓ Primeiro frame anotado gerado com sucesso!")
            else:
                print(" [ia] ✗ Erro ao codificar frame anotado")
        
        if frames_processed % 100 == 0:  # Log a cada 100 frames processados
            print(f" [ia] ✓ {frames_processed} frames processados | Tempo médio: {avg_processing_time_ms:.1f}ms")
                
    connection.close()

# --- THREAD 3: O SERVIDOR FLASK (Melhorado) ---
app = Flask(__name__)
# Configuração de CORS mais permissiva para desenvolvimento
CORS(app, resources={r"/*": {"origins": "*"}})

# Frame placeholder (imagem preta com texto)
def create_placeholder_frame():
    """Cria um frame placeholder quando não há frames disponíveis."""
    placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(placeholder, "Aguardando frames...", (150, 240), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    ret, buffer = cv2.imencode('.jpg', placeholder)
    if ret:
        return buffer.tobytes()
    return None

def generate_annotated_frames():
    """Gera o stream de vídeo anotado para o frontend."""
    print(" [web] Cliente conectado ao stream de vídeo anotado")
    frame_count = 0
    placeholder_bytes = create_placeholder_frame()
    
    while True:
        with data_lock:
            if latest_annotated_frame is None:
                # Se ainda não houver frames, envia um placeholder
                if placeholder_bytes:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + placeholder_bytes + b'\r\n')
                time.sleep(0.1)
                continue
            frame_bytes = latest_annotated_frame
            frame_count += 1
            if frame_count % 30 == 0:  # Log a cada 30 frames
                print(f" [web] Stream ativo: {frame_count} frames enviados")
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed_annotated')
def video_feed_annotated():
    """Endpoint que serve o fluxo de vídeo anotado."""
    print(" [web] Requisição recebida para /video_feed_annotated")
    return Response(generate_annotated_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/health')
def health():
    """Endpoint de health check para verificar status do serviço."""
    with data_lock:
        has_frames = latest_annotated_frame is not None
        detections_count = len(latest_detections)
    
    with frame_lock:
        has_raw_frames = latest_raw_frame is not None
    
    status = {
        "status": "online",
        "has_annotated_frames": has_frames,
        "has_raw_frames": has_raw_frames,
        "detections_count": detections_count,
        "video_stream_url": VIDEO_STREAM_URL,
        "rabbitmq_host": RABBITMQ_HOST
    }
    return status, 200

# --- PONTO DE ENTRADA (MODIFICADO) ---
if __name__ == '__main__':
    # 1. Iniciar o "Pulso de Vida" da IA (Thread)
    heartbeat_thread = threading.Thread(target=send_heartbeat, daemon=True)
    heartbeat_thread.start()
    print(" [web] Thread de pulso de vida da IA ATIVADO.")

    # 2. Iniciar o "Leitor de Frames" (Novo Thread)
    reader_thread = threading.Thread(target=frame_reader_loop, daemon=True)
    reader_thread.start()
    print(" [capture] Thread de leitura de frames ATIVADO.")

    # 3. Iniciar o "Classificador e Publicador" de IA (Thread)
    inference_thread = threading.Thread(target=inference_tracking_loop, daemon=True)
    inference_thread.start()
    print(" [ia] Loop de inferência e tracking ATIVADO.")

    # 4. Iniciar a API Web de Monitoramento (no thread principal)
    print(f" [web] Iniciando API Flask em http://{settings.INFERENCE_API_HOST}:{settings.INFERENCE_API_PORT}")
    app.run(host=settings.INFERENCE_API_HOST, port=settings.INFERENCE_API_PORT, threaded=True)