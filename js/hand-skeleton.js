// Step 3: draw the hand skeleton and face box on the canvas overlay.
// This file only handles drawing - hand-detection.js calls these
// functions every frame with whatever it found (hand, face, both, or
// neither).

const handCanvas = document.getElementById("hand-canvas");
const handCtx = handCanvas.getContext("2d");

// The 21 landmarks are numbered 0-20 by the model, always in this order:
// 0 = wrist, 1-4 = thumb, 5-8 = index, 9-12 = middle, 13-16 = ring, 17-20 = pinky.
const fingerConnections = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [0, 9, 10, 11, 12],
  [0, 13, 14, 15, 16],
  [0, 17, 18, 19, 20],
];

function resizeCanvasToVideo() {
  handCanvas.width = videoElement.videoWidth;
  handCanvas.height = videoElement.videoHeight;
}

// Clears the whole overlay. Called once per frame, BEFORE drawing
// whatever was detected that frame. hand-detection.js is responsible for
// calling this exactly once per frame - not drawHandSkeleton or
// drawFaceBox individually - since both can land on the same frame and
// we don't want one to erase the other.
function clearOverlay() {
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
}

function drawHandSkeleton(landmarks) {
  handCtx.strokeStyle = "#ffd166";
  handCtx.lineWidth = 3;
  fingerConnections.forEach((finger) => {
    handCtx.beginPath();
    finger.forEach((pointIndex, i) => {
      const [x, y] = landmarks[pointIndex];
      if (i === 0) {
        handCtx.moveTo(x, y);
      } else {
        handCtx.lineTo(x, y);
      }
    });
    handCtx.stroke();
  });

  handCtx.fillStyle = "#6b9e93";
  landmarks.forEach(([x, y]) => {
    handCtx.beginPath();
    handCtx.arc(x, y, 5, 0, 2 * Math.PI);
    handCtx.fill();
  });
}

// Draws a box around the detected face plus a dot at its center - that
// center point is the body anchor we'll use tomorrow to describe WHERE
// the hand is (near the chin, at chest height, etc.), not just its shape.
function drawFaceBox(faceBox) {
  const [x1, y1] = faceBox.topLeft;
  const [x2, y2] = faceBox.bottomRight;

  handCtx.strokeStyle = "#5a527a";
  handCtx.lineWidth = 2;
  handCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);

  handCtx.fillStyle = "#5a527a";
  handCtx.beginPath();
  handCtx.arc(faceBox.center[0], faceBox.center[1], 4, 0, 2 * Math.PI);
  handCtx.fill();
}

videoElement.addEventListener("loadedmetadata", () => {
  resizeCanvasToVideo();
});