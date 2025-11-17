from roboflow import Roboflow
rf = Roboflow(api_key="YPn2PFW06xNY8hY7Kc56")
project = rf.workspace("roboflow-58fyf").project("rock-paper-scissors-sxsw")
version = project.version(14)
dataset = version.download("yolov8")
                