import cv2

def list_available_cameras(max_checks=10):
    available_cameras = []

    for i in range (max_checks):
        cap = cv2.VideoCapture(i)

        if cap.isOpened():
            ret, frame = cap.read()

            if ret:
                print(f'Câmera encontrada no ID {i}')
                available_cameras.append(i)
            else:
                print(f'Falha na captura na camera com ID {i}')
        
            cap.release()

        else:
            pass

    if not available_cameras:
        print('Nenhuma camera encontrada')
    else:
        print(f'Ids Disponiveis para uso: {available_cameras}')

if __name__ == '__main__':
    list_available_cameras()