// Step 1 of training: let the user pick a sign language, pick a letter,
// and capture samples, now saved permanently in localStorage.

// Confirmed with Flo against the updated LSA alphabet (Alfabeto Manual
// Argentino, CAS): these 8 letters are single fixed hand positions, one
// hand only, no face contact, no movement - so they fit the handpose
// model's capabilities (Phase 1 of the project).
// Left out for now: Ñ, Q, W, X (two hands - need a different model),
// E and the second variant of V (touch the face), Z (movement).
const signLetterSets = {
  lsa: ["A", "B", "C", "F", "I", "M", "P", "R", "U"],
  asl: ["A", "B", "L", "I", "O", "U"],
};

let signLanguage = "lsa";
let selectedLetter = signLetterSets[signLanguage][0];

// This is our "database": a flat array of samples, each one
// { signLanguage, letter, landmarks }, where landmarks is the flattened
// array of 63 numbers. It lives in memory as `capturedSamples`, and gets
// mirrored into localStorage every time it changes so it survives a
// page refresh.
const STORAGE_KEY = "sign-translator-samples";

function loadSamplesFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Could not read stored samples, starting fresh:", error);
    return [];
  }
}

function saveSamplesToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capturedSamples));
}

let capturedSamples = loadSamplesFromStorage();

// Counts per sign language + letter, recalculated from capturedSamples
// whenever it changes, so the UI always reflects what's really stored.
function countSamples(forSignLanguage, forLetter) {
  return capturedSamples.filter(
    (sample) =>
      sample.signLanguage === forSignLanguage && sample.letter === forLetter
  ).length;
}

const signLsaButton = document.getElementById("sign-lsa");
const signAslButton = document.getElementById("sign-asl");
const letterButtonsContainer = document.getElementById("letter-buttons");
const sampleCountsContainer = document.getElementById("sample-counts");
const captureButton = document.getElementById("capture-btn");

function renderSignLanguageButtons() {
  signLsaButton.classList.toggle("selected", signLanguage === "lsa");
  signAslButton.classList.toggle("selected", signLanguage === "asl");
}

function renderLetterButtons() {
  letterButtonsContainer.innerHTML = "";

  signLetterSets[signLanguage].forEach((letter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = letter;
    button.className = "letter-btn";
    if (letter === selectedLetter) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      selectedLetter = letter;
      renderLetterButtons();
    });

    letterButtonsContainer.appendChild(button);
  });
}

function renderSampleCounts() {
  sampleCountsContainer.innerHTML = "";

  signLetterSets[signLanguage].forEach((letter) => {
    const row = document.createElement("div");
    row.className = "sample-count-row";
    const count = countSamples(signLanguage, letter);
    row.innerHTML = `<span>${letter}</span><span>${count} ${translations[currentLang].samplesWord}</span>`;
    sampleCountsContainer.appendChild(row);
  });
}

function switchSignLanguage(newSignLanguage) {
  signLanguage = newSignLanguage;
  selectedLetter = signLetterSets[signLanguage][0];
  renderSignLanguageButtons();
  renderLetterButtons();
  renderSampleCounts();
}

signLsaButton.addEventListener("click", () => switchSignLanguage("lsa"));
signAslButton.addEventListener("click", () => switchSignLanguage("asl"));

// Flattens the 21 [x, y, z] landmark points into a single array of 63
// numbers - the format we store and will eventually feed to the model.
function flattenLandmarks(landmarks) {
  return landmarks.flat();
}

captureButton.addEventListener("click", () => {
  if (!latestLandmarks) {
    console.warn("No hand detected right now - can't capture a sample.");
    return;
  }

  const flatSample = flattenLandmarks(latestLandmarks);

  capturedSamples.push({
    signLanguage,
    letter: selectedLetter,
    landmarks: flatSample,
  });
  saveSamplesToStorage();

  console.log(
    `Saved sample #${capturedSamples.length} for "${selectedLetter}" (${signLanguage.toUpperCase()}). Total stored: ${capturedSamples.length}`
  );

  renderSampleCounts();
});

// -----------------------------------------------------------------------
// WORDS (Phase 2): unlike letters, words are captured as a SEQUENCE of
// frames over ~1.2 seconds, not a single pose - because LSA words like
// "hola" or "gracias" are movements, not fixed hand shapes. Each frame
// stores hand shape (relative to the wrist, same idea as letters) PLUS
// the wrist's position relative to the face center (from blazeface),
// since where the hand moves relative to the body is often what
// distinguishes one word from another.
// -----------------------------------------------------------------------

const wordList = [
  { id: "hola", label: "Hola" },
  { id: "chau", label: "Chau" },
  { id: "porFavor", label: "Por favor" },
  { id: "permiso", label: "Permiso" },
  { id: "buenosDias", label: "Buenos días" },
  { id: "gracias", label: "Gracias" },
];

let selectedWord = wordList[0].id;

const WORD_STORAGE_KEY = "sign-translator-word-samples";
const RECORD_DURATION_MS = 1200;
const SEQUENCE_LENGTH = 30;
const MIN_VALID_FRAMES = 10;

function loadWordSamplesFromStorage() {
  try {
    const stored = localStorage.getItem(WORD_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Could not read stored word samples, starting fresh:", error);
    return [];
  }
}

function saveWordSamplesToStorage() {
  localStorage.setItem(WORD_STORAGE_KEY, JSON.stringify(capturedWordSamples));
}

let capturedWordSamples = loadWordSamplesFromStorage();

function countWordSamples(wordId) {
  return capturedWordSamples.filter((sample) => sample.word === wordId).length;
}

const modeLetterButton = document.getElementById("mode-letter");
const modeWordButton = document.getElementById("mode-word");
const letterModeSection = document.getElementById("letter-mode-section");
const wordModeSection = document.getElementById("word-mode-section");
const wordButtonsContainer = document.getElementById("word-buttons");
const wordSampleCountsContainer = document.getElementById("word-sample-counts");
const recordWordButton = document.getElementById("record-word-btn");
const recordStatusElement = document.getElementById("record-status");

let captureMode = "letter";

function switchMode(mode) {
  captureMode = mode;
  modeLetterButton.classList.toggle("selected", mode === "letter");
  modeWordButton.classList.toggle("selected", mode === "word");
  letterModeSection.classList.toggle("hidden", mode !== "letter");
  wordModeSection.classList.toggle("hidden", mode !== "word");
}

modeLetterButton.addEventListener("click", () => switchMode("letter"));
modeWordButton.addEventListener("click", () => switchMode("word"));

function renderWordButtons() {
  wordButtonsContainer.innerHTML = "";

  wordList.forEach(({ id, label }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
     button.className = "word-btn";
    if (id === selectedWord) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      selectedWord = id;
      renderWordButtons();
    });

    wordButtonsContainer.appendChild(button);
  });
}

function renderWordSampleCounts() {
  wordSampleCountsContainer.innerHTML = "";

  wordList.forEach(({ id, label }) => {
    const row = document.createElement("div");
    row.className = "sample-count-row";
    const count = countWordSamples(id);
    row.innerHTML = `<span>${label}</span><span>${count} ${translations[currentLang].samplesWord}</span>`;
    wordSampleCountsContainer.appendChild(row);
  });
}

// Builds one frame's feature vector: 63 numbers for hand shape (each of
// the 21 points relative to the wrist) + 2 numbers for where the wrist
// is relative to the face center, normalized by face width so it
// doesn't matter how close you're sitting to the camera.
function buildFrameFeatures(landmarks, faceBox) {
  const wrist = landmarks[0];

  const handShape = landmarks.flatMap(([x, y, z]) => [
    x - wrist[0],
    y - wrist[1],
    z - wrist[2],
  ]);

  const wristToFaceX = (wrist[0] - faceBox.center[0]) / faceBox.width;
  const wristToFaceY = (wrist[1] - faceBox.center[1]) / faceBox.width;

  return [...handShape, wristToFaceX, wristToFaceY];
}

// Every recording has a different number of raw frames, depending on
// how fast the browser could run both models. This resamples any
// length of sequence down (or up) to a fixed length by linear
// interpolation, so every stored sample has the same shape for training.
function resampleSequence(rawFrames, targetLength) {
  const result = [];
  const lastIndex = rawFrames.length - 1;

  for (let i = 0; i < targetLength; i++) {
    const t = (i / (targetLength - 1)) * lastIndex;
    const lowerIndex = Math.floor(t);
    const upperIndex = Math.min(lowerIndex + 1, lastIndex);
    const weight = t - lowerIndex;

    const lowerFrame = rawFrames[lowerIndex];
    const upperFrame = rawFrames[upperIndex];
    const blended = lowerFrame.map(
      (value, idx) => value + (upperFrame[idx] - value) * weight
    );

    result.push(blended);
  }

  return result;
}

let isRecordingWord = false;

async function recordWordSample() {
  if (isRecordingWord) return;
  isRecordingWord = true;
  recordWordButton.disabled = true;

  const rawFrames = [];
  const startTime = performance.now();

  await new Promise((resolve) => {
    function collectFrame() {
      const elapsed = performance.now() - startTime;

      if (elapsed < RECORD_DURATION_MS) {
        const remainingSeconds = ((RECORD_DURATION_MS - elapsed) / 1000).toFixed(1);
        recordStatusElement.textContent = `${translations[currentLang].recording} ${remainingSeconds}s`;

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

  isRecordingWord = false;
  recordWordButton.disabled = false;

  if (rawFrames.length < MIN_VALID_FRAMES) {
    recordStatusElement.textContent = translations[currentLang].recordTooShort;
    return;
  }

  const sequence = resampleSequence(rawFrames, SEQUENCE_LENGTH);

  capturedWordSamples.push({ word: selectedWord, sequence });
  saveWordSamplesToStorage();

  console.log(
    `Saved word sample for "${selectedWord}" (${rawFrames.length} raw frames -> resampled to ${SEQUENCE_LENGTH}). Total stored for this word: ${countWordSamples(selectedWord)}`
  );

  recordStatusElement.textContent = `${translations[currentLang].recordSaved} (${rawFrames.length} frames)`;
  renderWordSampleCounts();
}

recordWordButton.addEventListener("click", recordWordSample);

renderSignLanguageButtons();
renderLetterButtons();
renderSampleCounts();
renderWordButtons();
renderWordSampleCounts();
switchMode("letter");