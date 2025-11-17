import os

# --- Configurações da IA ---
MODEL_PATH = "models/best.pt"
ZONA_DE_DECISAO_X = 320

# --- Configurações de Rede dos Serviços ---
# Lê do 'os.getenv' primeiro, se não achar, usa o valor padrão 'localhost'
CAPTURE_SERVICE_URL = os.getenv("CAPTURE_SERVICE_URL", "http://localhost:5001/video_feed")
INFERENCE_API_HOST = os.getenv("INFERENCE_API_HOST", "0.0.0.0")
INFERENCE_API_PORT = int(os.getenv("INFERENCE_API_PORT", 5002))

# --- Configurações do RabbitMQ ---
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_QUEUE = "fila_decisoes_ia"
# --- Mapeamento de Decisões ---
DECISION_MAP = {
    "Rock": "esquerda",
    "Paper": "direita"
}