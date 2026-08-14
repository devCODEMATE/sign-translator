// Step 2: load the handpose and blazeface models, track both hand and
// face position every frame.
//
// Why blazeface too? handpose only sees the hand - it has no idea where
// that hand is relative to the body. But several LSA words (like the
// greeting/courtesy set Flo is building) are distinguished by WHERE the
// hand is - near the chin, at chest height, etc. - not just by hand
// shape. blazeface gives us a stable face position each frame, which we
// use as an anchor point to describe "hand relative to body". This
// wasn't needed for the letters (chosen specifically to avoid face
// contact and movement), but it matters for the words phase, next.

const modelStatusElement = document.getElementById("model-status");

let handModel = null;
let faceModel = null;

// Holds the results from the most recent frame (or null if nothing was
// detected this frame). Other scripts, like sample-recorder.js, read
// these globals at the moment the user clicks "Capture sample" - they're
// not function calls, just always up to date with the latest frame.
let latestLandmarks = null;
let latestFaceBox = null; // { topLeft: [x, y], bottomRight: [x, y], center: [x, y], width }

async function loadModels() {
  // Load both models in parallel - no reason to wait for one before
  // starting the other, they're independent downloads.
  [handModel, faceModel] = await Promise.all([
    handpose.load(),
    blazeface.load(),
  ]);
  modelStatusElement.textContent = translations[currentLang].modelReady;
  detectLoop();
}

async function detectLoop() {
  // Run both models on the same video frame in parallel, so the hand and
  // face readings we store always come from the same instant - important
  // once we start comparing hand position to face position.
  const [handPredictions, faceOutput] = await Promise.all([
    handModel.estimateHands(videoElement),
    faceModel.estimateFaces(videoElement, false), // false = return plain arrays, not tensors
  ]);

  clearOverlay();

  if (handPredictions.length > 0) {
    modelStatusElement.textContent = translations[currentLang].modelDetecting;
    latestLandmarks = handPredictions[0].landmarks;
    drawHandSkeleton(latestLandmarks);
  } else {
    modelStatusElement.textContent = translations[currentLang].modelNoHand;
    latestLandmarks = null;
  }

  if (faceOutput.length > 0) {
    const face = faceOutput[0];
    const topLeft = face.topLeft;
    const bottomRight = face.bottomRight;
    latestFaceBox = {
      topLeft,
      bottomRight,
      center: [
        (topLeft[0] + bottomRight[0]) / 2,
        (topLeft[1] + bottomRight[1]) / 2,
      ],
      // Face box width, used tomorrow to normalize hand-to-face distance
      // so it doesn't depend on how close you're sitting to the camera.
      width: bottomRight[0] - topLeft[0],
    };
    drawFaceBox(latestFaceBox);
  } else {
    latestFaceBox = null;
  }

  requestAnimationFrame(detectLoop);
}

videoElement.addEventListener("loadedmetadata", () => {
  loadModels();
});