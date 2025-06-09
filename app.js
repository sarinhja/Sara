let video;
let canvas;
let startTime;
let elapsedTime = 0;
let isActive = false;
let cameraStarted = false;

// Variables para distorsión
let eyeSeparation = 0;
let noseGrowth = 0;
let mouthStretch = 0;
let faceWidth = 0;
let eyeSize = 0;
let chinExtension = 0;
let foreheadBulge = 0;

// Configuración móvil
let canvasWidth, canvasHeight;

function setup() {
    // No crear canvas hasta que se inicie la cámara
    noLoop();
}

function startCamera() {
    // Configurar tamaño para móvil
    if (windowWidth > windowHeight) {
        canvasWidth = min(windowWidth * 0.9, 640);
        canvasHeight = min(windowHeight * 0.8, 480);
    } else {
        canvasWidth = min(windowWidth * 0.9, 400);
        canvasHeight = min(windowHeight * 0.7, 600);
    }
    
    canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('container');
    
    // Configurar cámara frontal para móvil
    let constraints = {
        video: {
            facingMode: 'user',
            width: { ideal: canvasWidth },
            height: { ideal: canvasHeight }
        },
        audio: false
    };
    
    video = createCapture(constraints, videoReady, videoError);
    video.size(canvasWidth, canvasHeight);
    video.hide();
    
    // Ocultar botón de inicio
    document.getElementById('startBtn').style.display = 'none';
}

function videoReady() {
    console.log('Video ready');
    cameraStarted = true;
    isActive = true;
    startTime = millis();
    
    // Mostrar overlay y botón reset
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('resetBtn').style.display = 'block';
    
    loop();
}

function videoError(err) {
    console.error('Error accessing camera:', err);
    document.getElementById('errorMsg').style.display = 'block';
    document.getElementById('startBtn').style.display = 'none';
}

function draw() {
    if (video && video.loadedmetadata && isActive && cameraStarted) {
        background(0);
        
        // Calcular tiempo transcurrido
        elapsedTime = (millis() - startTime) / 1000;
        updateTimer();
        
        // Calcular distorsiones progresivas
        calculateDistortions();
        
        // Aplicar distorsión facial
        applyFaceDistortion();
    }
}

function calculateDistortions() {
    let t = elapsedTime;
    
    // Separación gradual de ojos (0-30 píxeles en 30 segundos)
    eyeSeparation = map(sin(t * 0.1), -1, 1, 0, t * 1.5);
    eyeSeparation = constrain(eyeSeparation, 0, 50);
    
    // Crecimiento de nariz (0-40 píxeles en 20 segundos)
    noseGrowth = map(t, 0, 20, 0, 40);
    noseGrowth = constrain(noseGrowth * sin(t * 0.15), 0, 60);
    
    // Estiramiento de boca
    mouthStretch = map(t, 0, 25, 0, 30);
    mouthStretch = mouthStretch * (1 + sin(t * 0.2) * 0.3);
    
    // Expansión de cara
    faceWidth = map(t, 0, 35, 0, 80);
    faceWidth = faceWidth * (1 + cos(t * 0.1) * 0.2);
    
    // Cambio de tamaño de ojos
    eyeSize = sin(t * 0.3) * 15 + t * 0.5;
    
    // Extensión de barbilla
    chinExtension = map(t, 0, 40, 0, 50);
    chinExtension = chinExtension * (1 + sin(t * 0.25) * 0.4);
    
    // Abultamiento de frente
    foreheadBulge = map(t, 0, 30, 0, 35);
    foreheadBulge = foreheadBulge * cos(t * 0.18);
}

function applyFaceDistortion() {
    if (!video || !video.loadedmetadata) return;
    
    loadPixels();
    video.loadPixels();
    
    let centerX = width / 2;
    let centerY = height / 2;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sourceX = x;
            let sourceY = y;
            
            // Calcular posición relativa al centro de la cara
            let relX = x - centerX;
            let relY = y - centerY;
            let distance = sqrt(relX * relX + relY * relY);
            let angle = atan2(relY, relX);
            
            // Aplicar distorsiones por zonas
            
            // Zona de ojos (tercio superior)
            if (y < height * 0.4) {
                // Separar ojos horizontalmente
                if (abs(relX) < width * 0.3) {
                    sourceX += (relX > 0 ? eyeSeparation : -eyeSeparation) * 0.5;
                }
                
                // Cambiar tamaño de ojos
                if (distance < 60 && abs(relY + height * 0.1) < 30) {
                    let eyeScale = 1 + eyeSize * 0.01;
                    sourceX = centerX + relX * eyeScale;
                    sourceY = centerY + relY * eyeScale;
                }
                
                // Abultamiento de frente
                if (y < height * 0.25) {
                    sourceY += foreheadBulge * 0.3;
                }
            }
            
            // Zona de nariz (centro)
            if (y > height * 0.35 && y < height * 0.65 && abs(relX) < width * 0.15) {
                // Crecimiento de nariz
                let noseScale = 1 + noseGrowth * 0.02;
                sourceX = centerX + relX * noseScale;
                sourceY = centerY + relY + noseGrowth * 0.3;
            }
            
            // Zona de boca (tercio inferior)
            if (y > height * 0.6 && y < height * 0.8) {
                // Estiramiento horizontal de boca
                if (abs(relX) < width * 0.25) {
                    sourceX += relX * mouthStretch * 0.01;
                }
            }
            
            // Expansión general de cara
            if (distance < min(width, height) * 0.4) {
                let faceScale = 1 + faceWidth * 0.005;
                sourceX = centerX + relX * faceScale;
            }
            
            // Extensión de barbilla
            if (y > height * 0.7) {
                sourceY += chinExtension * 0.5 * (y - height * 0.7) / (height * 0.3);
            }
            
            // Asegurar que las coordenadas estén dentro de los límites
            sourceX = constrain(sourceX, 0, width - 1);
            sourceY = constrain(sourceY, 0, height - 1);
            
            // Aplicar pixel
            let sourceIndex = (floor(sourceY) * video.width + floor(sourceX)) * 4;
            let targetIndex = (y * width + x) * 4;
            
            if (sourceIndex >= 0 && sourceIndex < video.pixels.length - 3) {
                pixels[targetIndex] = video.pixels[sourceIndex];
                pixels[targetIndex + 1] = video.pixels[sourceIndex + 1];
                pixels[targetIndex + 2] = video.pixels[sourceIndex + 2];
                pixels[targetIndex + 3] = 255;
            }
        }
    }
    
    updatePixels();
    
    // Agregar efectos adicionales
    addGlitchEffect();
}

function addGlitchEffect() {
    // Efecto de glitch ocasional
    if (elapsedTime > 10 && random() < 0.02) {
        let glitchHeight = random(5, 20);
        let glitchY = random(height - glitchHeight);
        
        for (let i = 0; i < 3; i++) {
            let offset = random(-10, 10);
            copy(canvas, 0, glitchY, width, glitchHeight, 
                 offset, glitchY, width, glitchHeight);
        }
    }
    
    // Distorsión de color progresiva
    if (elapsedTime > 15) {
        tint(255, 200 - elapsedTime * 2, 200 - elapsedTime * 3);
    }
}

function updateTimer() {
    let minutes = floor(elapsedTime / 60);
    let seconds = floor(elapsedTime % 60);
    let timeString = nf(minutes, 2) + ':' + nf(seconds, 2);
    document.getElementById('timer').textContent = timeString;
}

function resetDistortion() {
    if (cameraStarted) {
        startTime = millis();
        elapsedTime = 0;
        eyeSeparation = 0;
        noseGrowth = 0;
        mouthStretch = 0;
        faceWidth = 0;
        eyeSize = 0;
        chinExtension = 0;
        foreheadBulge = 0;
        noTint();
    }
}

// Ajustar tamaño cuando se rota el dispositivo
function windowResized() {
    if (cameraStarted && canvas) {
        if (windowWidth > windowHeight) {
            canvasWidth = min(windowWidth * 0.9, 640);
            canvasHeight = min(windowHeight * 0.8, 480);
        } else {
            canvasWidth = min(windowWidth * 0.9, 400);
            canvasHeight = min(windowHeight * 0.7, 600);
        }
        
        resizeCanvas(canvasWidth, canvasHeight);
        if (video) {
            video.size(canvasWidth, canvasHeight);
        }
    }
}

// Función para tomar captura (toque doble)
let lastTap = 0;
function touchEnded() {
    if (cameraStarted && canvas) {
        let currentTime = millis();
        if (currentTime - lastTap < 300) {
            // Doble toque - tomar captura
            save(canvas, 'distorted-face-' + nf(elapsedTime, 0, 1) + 's.png');
        }
        lastTap = currentTime;
    }
}

// Prevenir zoom en móvil
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchmove', function(e) {
    e.preventDefault();
}, { passive: false });
