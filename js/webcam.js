// This is Step 1: just get the webcam feed showing on screen.
// No TensorFlow.js yet - that comes once this part works.

const videoElement = document.getElementById("webcam");
const statusElement = document.getElementById("status");

async function setupWebcam() {
  try {
    // Attach the listener BEFORE assigning srcObject.
    // If we attach it after, there's a small chance the event
    // already fired (e.g. the camera was accessed very recently)
    // and we'd miss it, leaving the status text stuck.
    videoElement.addEventListener("loadedmetadata", () => {
      const activeText = translations[currentLang].statusActive;
      statusElement.textContent = `${activeText} (${videoElement.videoWidth}x${videoElement.videoHeight})`;
    });

    // navigator.mediaDevices.getUserMedia asks the browser for camera access.
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
      },
      audio: false,
    });

    videoElement.srcObject = stream;
  } catch (error) {
    console.error("Error accessing webcam:", error);
    statusElement.textContent = translations[currentLang].statusError;
  }
}

setupWebcam();