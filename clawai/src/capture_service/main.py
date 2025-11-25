import cv2
from flask import Flask, Response
import time
import threading
import requests
import os

app = Flask(__name__)

VIDEOCAPTUREID = int(os.getenv("VIDEOCAPTUREID"))

video_capture = cv2.VideoCapture(VIDEOCAPTUREID) 

CAMERA_NAME = "Camera 01"
CAMERA_WIDTH = int(video_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
CAMERA_HEIGHT = int(video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
CAMERA_FPS = int(video_capture.get(cv2.CAP_PROP_FPS))
CAMERA_RESOLUTION_STR = f"{CAMERA_WIDTH}x{CAMERA_HEIGHT}"
NESTJS_HEARTBEAT_URL = os.getenv("NESTJS_HEARTBEAT_URL", "http://localhost:3001/stats/heartbeat")

def generate_frames():
    """Lê frames da câmera e os converte para o formato MJPEG."""
    while True:
        success, frame = video_capture.read()
        if not success:
            print("Erro ao capturar frame da câmera. Tentando novamente...")
            continue
        else:
            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

def send_heartbeat():
    """Envia um pulso de vida para o backend NestJS a cada 10 segundos."""
    while True:
        try:
            payload = {
                "service": "camera",
                "status": "online",
                "cameraName": CAMERA_NAME,
                "resolution": CAMERA_RESOLUTION_STR,
                "fps": CAMERA_FPS
            }
            requests.post(NESTJS_HEARTBEAT_URL, json=payload, timeout=2)
            print(f" [web] Pulso de vida da Câmera enviado para NestJS.")
        except Exception as e:
            print(f" [web] Falha ao enviar pulso de vida da Câmera: {e}")
        
        time.sleep(10)

@app.route('/video_feed')
def video_feed():
    """Endpoint que serve o fluxo de vídeo."""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/health')
def health():
    """Endpoint de health check para verificar status do serviço."""
    is_camera_open = video_capture.isOpened() if video_capture else False
    status = {
        "status": "online",
        "camera_open": is_camera_open,
        "camera_name": CAMERA_NAME,
        "resolution": CAMERA_RESOLUTION_STR,
        "fps": CAMERA_FPS
    }
    return status, 200

if __name__ == '__main__':
    heartbeat_thread = threading.Thread(target=send_heartbeat, daemon=True)
    heartbeat_thread.start()
    print(f" [web] Thread de pulso de vida da Câmera ATIVADO.")
    
    print(f" [web] Iniciando API da Câmera em http://0.0.0.0:5001")
    print(f" [info] Câmera detectada: {CAMERA_RESOLUTION_STR} @ {CAMERA_FPS}fps")
    app.run(host='0.0.0.0', port=5001, threaded=True)