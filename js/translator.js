// The actual translator screen: loops the already-confirmed
// recognizeWord() (from recognize.js, untouched) by simulating clicks
// on its hidden button, watches for its result to change, and shows +
// speaks the word - without modifying any of today's tested code.

const translatorOutputEl = document.getElementById("translator-output");
const translatorPhraseEl = document.getElementById("translator-phrase");
const startStopBtn = document.getElementById("translator-start-stop");
const resetBtn = document.getElementById("translator-reset");
const hiddenWordResult = document.getElementById("recognize-word-result");
const hiddenWordButton = document.getElementById("recognize-word-btn");
const listeningStatusEl = document.getElementById("translator-listening-status");


let isTranslating = false;
let phraseWords = [];
const MAX_PHRASE_WORDS = 4;
const PAUSE_BETWEEN_ATTEMPTS_MS = 700;

function speakText(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-AR";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

function watchForWordResult() {
 const observer = new MutationObserver(() => {
    const text = hiddenWordResult.textContent.trim();

    if (text.startsWith("Grabando")) {
      listeningStatusEl.textContent = "🔴 Capturando tu seña...";
      return;
    }

    if (text.startsWith("Muy corta")) {
      listeningStatusEl.textContent = "No se vio bien tu mano y tu cara - reintentando...";
      if (isTranslating) {
        waitForHandToLeaveBeforeNextCapture();
      }
      return;
    }

    if (!text || !text.includes("(")) return;

    const word = text.split(" (")[0];
    const confidenceMatch = text.match(/\(([\d.]+)%\)/);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0;

    const CONFIDENCE_THRESHOLD = 75;

    if (confidence < CONFIDENCE_THRESHOLD) {
      listeningStatusEl.textContent = "🤔 No estoy segura - probá de nuevo";
      if (isTranslating) {
        waitForHandToLeaveBeforeNextCapture();
      }
      return;
    }

    translatorOutputEl.textContent = word;
    phraseWords.push(word);
    if (phraseWords.length > MAX_PHRASE_WORDS) phraseWords.shift();
    translatorPhraseEl.textContent = phraseWords.join(", ");

    speakText(word);
    listeningStatusEl.textContent = "";
    recognizeWordBtn.disabled = false;
  });

  observer.observe(hiddenWordResult, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

const recognizeWordBtn = document.getElementById("translator-recognize-btn");
recognizeWordBtn.addEventListener("click", () => {
  recognizeWordBtn.disabled = true;
  listeningStatusEl.textContent = "";
  recognizeWord(); // Call directly instead of simulating a click on the
                    // hidden button - click() on display:none elements
                    // can be unreliable on mobile Safari.
});

// After a word is recognized, wait until the hand actually leaves the
// frame (or stays still doing nothing new) before starting the next
// capture - otherwise the tail end of the same gesture gets captured
// again and reads as a repeat.
function waitForHandToLeaveBeforeNextCapture() {
  const checkIntervalMs = 150;
  const requiredNoHandChecks = 4;

  listeningStatusEl.textContent = "✋ Bajá la mano un instante para la próxima seña...";


  let noHandStreak = 0;

  const intervalId = setInterval(() => {
    if (!isTranslating) {
      clearInterval(intervalId);
      return;
    }

    if (!latestLandmarks) {
      noHandStreak++;
    } else {
      noHandStreak = 0;
    }

     if (noHandStreak >= requiredNoHandChecks) {
      clearInterval(intervalId);
      listeningStatusEl.textContent = "👂 Escuchando... mostrá la próxima seña";
      try {
        hiddenWordButton.click();
      } catch (error) {
        console.error("Error al reintentar la captura:", error);
        // Even on error, keep the loop alive - try again after the
        // usual pause instead of dying silently.
        setTimeout(() => waitForHandToLeaveBeforeNextCapture(), PAUSE_BETWEEN_ATTEMPTS_MS);
      }
    }
  }, checkIntervalMs);
}

resetBtn.addEventListener("click", () => {
  phraseWords = [];
  translatorPhraseEl.textContent = "—";
  translatorOutputEl.textContent = "—";
});

watchForWordResult();