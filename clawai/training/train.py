from ultralytics import YOLO
from multiprocessing import freeze_support

def start_training():

    model = YOLO("yolov8m.pt")

    results = model.train(
        device = '0',
        data = 'ClawAi/training/rock-paper-scissors-14/data.yaml',

        epochs = 50,

        imgsz = 640,
        batch = 8,

        project= 'training_runs',
        name = 'rock-paper-scissors',
    )

    results = model.val()

if __name__ == "__main__":
    freeze_support()
    start_training()