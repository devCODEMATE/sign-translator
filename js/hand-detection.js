// Step 2: load the handpose model and log detections to the console.
// No drawing on screen yet - just confirming the model can "see" a hand.

const modelStatusElement = document.getElementById("model-status");

let handModel = null;

async function loadHandModel() {
  // handpose.load() downloads and initializes the pre-trained model.
  // This can take a couple of seconds the first time (no caching yet).
  handModel = await handpose.load();
  modelStatusElement.textContent = translations[currentLang].modelReady;
  detectHandsLoop();
}

async function detectHandsLoop() {
  // estimateHands() runs inference on the current video frame.
  // It returns an array: empty if no hand is visible, or one entry
  // per detected hand, each with a "landmarks" array of 21 [x, y, z] points.
  const predictions = await handModel.estimateHands(videoElement);

  if (predictions.length > 0) {
    modelStatusElement.textContent = translations[currentLang].modelDetecting;
    console.log("Hand landmarks:", predictions[0].landmarks);
  } else {
    modelStatusElement.textContent = translations[currentLang].modelNoHand;
  }

  // requestAnimationFrame schedules this function to run again on the
  // next screen refresh, creating a continuous detection loop.
  requestAnimationFrame(detectHandsLoop);
}

// We wait for the webcam's "loadedmetadata" event (fired in webcam.js)
// before loading the model, so we know the video is actually playing.
videoElement.addEventListener("loadedmetadata", () => {
  loadHandModel();
});