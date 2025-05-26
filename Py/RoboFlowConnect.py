from roboflow import Roboflow
import cv2, math, os


class RoboFlowClient:
    # Подключение к серверу roboflow и выбор модели
    def __init__(self, API, id, venv=1):
        try:
            self.rf = Roboflow(api_key=API)
            self.project = self.rf.workspace().project(id)
            self.model = self.project.version(venv).model
            self.status=True
        except:
            self.status=False


    # Запрос на обраотку модель фотографии
    def predict(self, image_path, confidence=10):
        image_path = self.isSize(image_path)
        image_path = self.isWeight(image_path)
        try:
            prediction = self.model.predict(image_path, confidence=confidence).json()
            return True, prediction, image_path
        except Exception as e:
            return False, e, image_path
    

    # Проверка файла по размеру и изменение его под необходимый
    def isSize(self, image_path):
        img = cv2.imread(image_path)
        h, w = img.shape[:2]

        if h*w <= 89478485:
            return image_path
        else:
            H = math.sqrt((h*89478485)/w)
            W = 89478485/H

            img = cv2.resize(img, (int(W), int(H)))
            cv2.imwrite(f"{image_path.split('.')[0]}_resize.jpg", img)
            return f"{image_path.split('.')[0]}_resize.jpg"


    def isWeight(self, image_path):
        print(os.path.getsize(image_path)/1024/1024)

        if os.path.getsize(image_path)/1024/1024 > 2:
            img = cv2.imread(image_path)
            k = 100

            image_path = f"{image_path.split('.')[0]}_reweight.jpg"
            cv2.imwrite(image_path, img)

            while os.path.getsize(image_path)/1024/1024>2:
                k-=5
                cv2.imwrite(image_path, img, [cv2.IMWRITE_JPEG_QUALITY, k])

        return image_path
