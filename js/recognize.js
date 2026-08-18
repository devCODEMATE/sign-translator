// Step 5: live recognition. Uses the models already trained and saved
// in IndexedDB - this is the bridge between "models we trained" and
// the actual translator screen we build next: capture what the camera
// sees right now, run it through the same normalization used during
// training, and ask the model what it thinks it is.

let loadedLetterModel = null;
let loadedLetterClasses = null;
let loadedWordModel = null;
let loadedWordClasses = null;
let loadedWordMeans = null;
let loadedWordStds = null;

async function loadModelsForRecognition() {
  // Load from static files in /models, committed to the repo - this
  // works on any device visiting the site, unlike IndexedDB (which is
  // local to whichever browser ran the training).
  try {
    loadedLetterModel = await tf.loadLayersModel("models/letter-model.json");
    const lettersResponse = await fetch("models/letter-classes.json");
    loadedLetterClasses = await lettersResponse.json();
    console.log("Modelo de letras cargado para reconocimiento.");
  } catch (error) {
    console.warn("No se pudo cargar el modelo de letras.", error);
  }

  try {
    loadedWordModel = await tf.loadLayersModel("models/word-model.json");
    const wordsResponse = await fetch("models/word-classes.json");
    loadedWordClasses = await wordsResponse.json();
    const statsResponse = await fetch("models/word-feature-stats.json");
    const stats = await statsResponse.json();
    loadedWordMeans = stats.means;
    loadedWordStds = stats.stds;
    console.log("Modelo de palabras cargado para reconocimiento.");
  } catch (error) {
    console.warn("No se pudo cargar el modelo de palabras.", error);
  }
}

function recognizeLetter() {
  const resultEl = document.getElementById("recognize-letter-result");

  if (!loadedLetterModel) {
    resultEl.textContent = "Entrená el modelo de letras primero.";
    return;
  }
  if (!latestLandmarks) {
    resultEl.textContent = "No se detecta ninguna mano.";
    return;
  }

  const flat = flattenLandmarks(latestLandmarks);
  const normalized = normalizeLetterLandmarks(flat);
  const inputTensor = tf.tensor2d([normalized]);

  const prediction = loadedLetterModel.predict(inputTensor);
  const probabilities = prediction.dataSync();
  const bestIndex = probabilities.indexOf(Math.max(...probabilities));
  const confidence = (probabilities[bestIndex] * 100).toFixed(1);

  resultEl.textContent = `${loadedLetterClasses[bestIndex]} (${confidence}%)`;

  inputTensor.dispose();
  prediction.dispose();
}

let isRecognizingWord = false;

async function recognizeWord() {
  const resultEl = document.getElementById("recognize-word-result");
  const recognizeButton = document.getElementById("recognize-word-btn");

  if (!loadedWordModel) {
    resultEl.textContent = "Entrená el modelo de palabras primero.";
    return;
  }
  if (isRecognizingWord) return;

  isRecognizingWord = true;
  recognizeButton.disabled = true;

  const rawFrames = [];
  const startTime = performance.now();

  await new Promise((resolve) => {
    function collectFrame() {
      const elapsed = performance.now() - startTime;

      if (elapsed < RECORD_DURATION_MS) {
        const remainingSeconds = ((RECORD_DURATION_MS - elapsed) / 1000).toFixed(1);
        resultEl.textContent = `Grabando... ${remainingSeconds}s`;

        if (latestLandmarks && latestFaceBox) {
          rawFrames.push(buildFrameFeatures(latestLandmarks, latestFaceBox));
        }

        requestAnimationFrame(collectFrame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(collectFrame);
  });

  isRecognizingWord = false;
  recognizeButton.disabled = false;

  if (rawFrames.length < MIN_VALID_FRAMES) {
    resultEl.textContent = "Muy corta - asegurate de que se vean tu mano Y tu cara.";
    return;
  }

  const sequence = resampleSequence(rawFrames, SEQUENCE_LENGTH);
  const flatSequence = flattenSequence(sequence);

  const standardized = flatSequence.map(
    (value, i) => (value - loadedWordMeans[i]) / loadedWordStds[i]
  );

  const inputTensor = tf.tensor2d([standardized]);
  const prediction = loadedWordModel.predict(inputTensor);
  const probabilities = prediction.dataSync();
  const bestIndex = probabilities.indexOf(Math.max(...probabilities));
  const confidence = (probabilities[bestIndex] * 100).toFixed(1);

  resultEl.textContent = `${loadedWordClasses[bestIndex]} (${confidence}%)`;

  inputTensor.dispose();
  prediction.dispose();
}

document.getElementById("recognize-letter-btn").addEventListener("click", recognizeLetter);
document.getElementById("recognize-word-btn").addEventListener("click", recognizeWord);

loadModelsForRecognition();