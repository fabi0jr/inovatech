import cv2
import sys

# Simula a leitura da stream. Pode ser adaptado para usar shared.camera_stream se necessário.
def main():
    if len(sys.argv) < 2:
        print("Uso: python setup_roi.py <video_source_ou_indice_camera>")
        print("Exemplo: python setup_roi.py 0")
        print("Exemplo: python setup_roi.py rtsp://192.168.1.10:554/stream")
        return

    source = sys.argv[1]
    
    # Tenta converter para int se for índice de webcam
    try:
        source = int(source)
    except ValueError:
        pass

    cap = cv2.VideoCapture(source)

    if not cap.isOpened():
        print(f"Erro: Não foi possível abrir a fonte {source}")
        return

    print("--- INSTRUÇÕES ---")
    print("1. O frame será aberto.")
    print("2. Use o MOUSE para desenhar um retângulo na área de interesse.")
    print("3. Pressione ESPAÇO ou ENTER para confirmar.")
    print("4. Pressione 'c' para cancelar a seleção.")
    print("------------------")

    ret, frame = cap.read()
    if not ret:
        print("Erro: Não foi possível ler o primeiro frame.")
        return

    # Função nativa do OpenCV para seleção de ROI
    # Retorna uma tupla (x, y, w, h)
    roi = cv2.selectROI("Selecione a Area de Deteccao (ROI)", frame, fromCenter=False, showCrosshair=True)
    
    # Fecha a janela
    cv2.destroyAllWindows()
    cap.release()

    # Verifica se algo foi selecionado (w e h > 0)
    if roi[2] > 0 and roi[3] > 0:
        x, y, w, h = roi
        # Convertendo para formato (x1, y1, x2, y2) que é mais seguro para slicing numpy
        x1, y1 = int(x), int(y)
        x2, y2 = int(x + w), int(y + h)

        print("\n\n>>> COPIE A LINHA ABAIXO PARA O SEU config/settings.py <<<")
        print(f"'{source}': [{x1}, {y1}, {x2}, {y2}],  # ROI: x1, y1, x2, y2")
        print(">>> --------------------------------------------------- <<<")
    else:
        print("\nSeleção cancelada ou inválida.")

if __name__ == "__main__":
    main()