// Конфигурация для подключения к нейросети
const ROBOTFLOW_API_KEY = "kiOOLFEB0IEr1rIbZYlW";
const ROBOTFLOW_MODEL_ID = "tracing-ontoursslice";
const ROBOTFLOW_MODEL_VERSION = "1";

// Лимиты для изображения
const MAX_PIXELS = 89478485; // Максимальное количество пикселей
const MAX_FILE_SIZE_MB = 2; // Максимальный размер файла в MB

// Элементы DOM
const imageUpload = document.getElementById('imageUpload');
const detectButton = document.getElementById('detectButton');
const originalImage = document.getElementById('originalImage');
const processedCanvas = document.getElementById('processedCanvas');
const loadingIndicator = document.getElementById('loadingIndicator');
const predictionsList = document.getElementById('predictionsList');

// Контекст canvas
const ctx = processedCanvas.getContext('2d');

// Цвета для разных классов объектов
const classColors = {};

// Функция для генерации случайного цвета
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Функция для расчета толщины линии в зависимости от размера изображения
function calculateLineWidth(imageWidth, imageHeight) {
    // Настройки для расчета толщины линии
    const baseSize = 1000;
    const baseLineWidth = 3;
    
    // Определяем большую сторону изображения
    const maxDimension = Math.max(imageWidth, imageHeight);
    
    // Рассчитываем коэффициент масштабирования
    const scaleFactor = maxDimension / baseSize;
    
    // Рассчитываем толщину линии (не менее 1px)
    const lineWidth = Math.max(5, baseLineWidth * scaleFactor);
    
    return lineWidth;
}

// Функция для отображения результатов с контурами
function displayResults(predictions) {
    processedCanvas.width = originalImage.naturalWidth;
    processedCanvas.height = originalImage.naturalHeight;
    
    // Рассчитываем толщину линии для этого изображения
    const lineWidth = calculateLineWidth(processedCanvas.width, processedCanvas.height);
    
    ctx.drawImage(originalImage, 0, 0, processedCanvas.width, processedCanvas.height);
    predictionsList.innerHTML = '';
    
    predictions.predictions.forEach((prediction, index) => {
        const color = classColors[prediction.class] || getRandomColor();

        if (prediction.points) {
            drawContour(prediction.points, color, prediction.class, prediction.confidence, lineWidth);
        } 
        else if (prediction.x && prediction.y && prediction.width && prediction.height) {
            drawBoundingBox(prediction, color, prediction.class, prediction.confidence, lineWidth);
        }

        addPredictionToList(prediction, color, index);
    });
    
    processedCanvas.style.display = 'block';
}

// Функция для рисования контура объекта
function drawContour(points, color, className, confidence, lineWidth) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.closePath();
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    
    ctx.fillStyle = color + '40';
    ctx.fill();
}

// Функция для рисования bounding box
function drawBoundingBox(prediction, color, className, confidence, lineWidth) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(
        prediction.x - prediction.width / 2,
        prediction.y - prediction.height / 2,
        prediction.width,
        prediction.height
    );
    
    ctx.fillStyle = color + '40';
    ctx.fillRect(
        prediction.x - prediction.width / 2,
        prediction.y - prediction.height / 2,
        prediction.width,
        prediction.height
    );
}

// Функция для добавления предсказания в список
function addPredictionToList(prediction, color, index) {
    const predictionItem = document.createElement('div');
    predictionItem.className = 'prediction-item';
    
    const colorIndicator = document.createElement('span');
    colorIndicator.className = 'color-indicator';
    colorIndicator.style.backgroundColor = color;
    
    predictionItem.appendChild(colorIndicator);
    
    const info = document.createElement('span');
    info.innerHTML = `
        <strong>${prediction.class}</strong> - 
        Уверенность: ${Math.round(prediction.confidence * 100)}%<br>
    `;
    
    if (prediction.points) {
        info.innerHTML += `Точек контура: ${prediction.points.length}<br>`;
    }
    
    if (prediction.x && prediction.y) {
        info.innerHTML += `Центр: (${Math.round(prediction.x)}, ${Math.round(prediction.y)})<br>`;
    }
    
    if (prediction.width && prediction.height) {
        info.innerHTML += `Размер: ${Math.round(prediction.width)}×${Math.round(prediction.height)}`;
    }
    
    predictionItem.appendChild(info);
    predictionsList.appendChild(predictionItem);
}

// Обработчик загрузки изображения
imageUpload.addEventListener('change', async function(e) {
    if (e.target.files.length === 0) {
        detectButton.disabled = true;
        return;
    }
    
    const file = e.target.files[0];

    
    const reader = new FileReader();
    
    reader.onload = async function(event) {
        try {
            loadingIndicator.style.display = 'block';
            // Обрабатываем изображение
            const processedImage = await processImage(event.target.result);
            
            originalImage.src = processedImage;
            originalImage.style.display = 'block';
            detectButton.disabled = false;
            
            // Очищаем предыдущие результаты
            processedCanvas.style.display = 'none';
            predictionsList.innerHTML = '';
            loadingIndicator.style.display = 'none';
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Ошибка при обработке изображения: ' + error.message);
            loadingIndicator.style.display = 'none';
        }
    };
    
    reader.readAsDataURL(file);
});

// Функция для обработки изображения перед отправкой
async function processImage(imageData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = async function() {
            try {
                // Создаем canvas для обработки изображения
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Проверка и коррекция размера (пикселей)
                let width = img.width;
                let height = img.height;
                let pixels = width * height;
                
                if (pixels > MAX_PIXELS) {
                    const ratio = Math.sqrt(MAX_PIXELS / pixels);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                    console.log(`Изменен размер изображения с ${img.width}x${img.height} на ${width}x${height}`);
                }
                
                // Устанавливаем размер canvas и рисуем изображение
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Проверка и коррекция веса (размера файла)
                let quality = 0.92; // Начальное качество (0.0 - 1.0)
                let resultDataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // Функция для вычисления размера в MB
                const getSizeMB = (dataUrl) => {
                    return (dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75 / (1024 * 1024);
                };
                
                // Постепенно уменьшаем качество, пока размер не станет допустимым
                while (getSizeMB(resultDataUrl) > MAX_FILE_SIZE_MB && quality > 0.1) {
                    quality -= 0.05;
                    resultDataUrl = canvas.toDataURL('image/jpeg', quality);
                    console.log(`Уменьшаем качество до ${Math.round(quality * 100)}%, размер: ${getSizeMB(resultDataUrl).toFixed(2)}MB`);
                }
                
                if (getSizeMB(resultDataUrl) > MAX_FILE_SIZE_MB) {
                    console.warn('Не удалось уменьшить размер файла до допустимого значения');
                } else {
                    console.log(`Финальный размер: ${getSizeMB(resultDataUrl).toFixed(2)}MB, качество: ${Math.round(quality * 100)}%`);
                }
                
                resolve(resultDataUrl);
            } catch (error) {
                reject(new Error('Ошибка при обработке изображения: ' + error.message));
            }
        };
        
        img.onerror = function() {
            reject(new Error('Не удалось загрузить изображение'));
        };
        
        img.src = imageData;
    });
}

// Обработчик кнопки обнаружения
detectButton.addEventListener('click', function() {
    if (!originalImage.src) return;
    
    loadingIndicator.style.display = 'block';
    detectButton.disabled = true;
    
    detectObjects(originalImage.src)
        .then(predictions => {
            displayResults(predictions);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Произошла ошибка при обработке изображения: ' + error.message);
        })
        .finally(() => {
            loadingIndicator.style.display = 'none';
            detectButton.disabled = false;
        });
});

// Функция для вызова нейросети
async function detectObjects(imageSrc) {
    // Преобразуем Data URL в Blob
    const blob = await fetch(imageSrc).then(res => res.blob());
    
    const formData = new FormData();
    formData.append('file', blob);
    
    const url = `https://detect.roboflow.com/${ROBOTFLOW_MODEL_ID}/${ROBOTFLOW_MODEL_VERSION}?api_key=${ROBOTFLOW_API_KEY}&format=json`;
    
    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}