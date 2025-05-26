# Импортируем необходимые библиотеки
from RoboFlowConnect import RoboFlowClient
import numpy as np
import cv2

# казываем путь до изображения
img_path="img.jpg"

# Создаем класс для общения с сервером RoboFlow
RbFwClient = RoboFlowClient("kiOOLFEB0IEr1rIbZYlW", "tracing-ontoursslice")

# Проверка подключения к серверу
if RbFwClient.status == False:
  exit("Ошибка подключения к RoboFlow")

# Получение контуров на изображении
status, prediction, img_path = RbFwClient.predict(img_path, 80)

# Проверяем полученный результат от нейросети
if status == False:
  exit(f"Error while getting contours on image: {prediction}")
print("mmmm")
# Открываем изображение
img = cv2.imread(img_path)

# Переводим изображение в BGR
img_bgr = img[:, :, ::-1].copy()

# Обрабатываем изображение выделяем главные части
for region in prediction['predictions']:
    # Преобразуем массив от нейросети в массив для cv2
    points = []

    for point in region['points']:
        points.append((int(point['x']), int(point['y'])))

    pts = np.array(points, np.int32)
    points = pts.reshape((-1, 1, 2))

    # Соединяем точки линией
    cv2.polylines(img_bgr, [points], True, (0, 255, 0), thickness=50)

# Сохраняем изображение с результатами
cv2.imwrite("output_image.png", img_bgr)
