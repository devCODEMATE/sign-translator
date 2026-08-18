// The actual translator screen: calls recognizeWord() (from
// recognize.js, untouched) directly, watches its hidden result element
// for changes, and shows + speaks the word.

const translatorOutputEl = document.getElementById("translator-output");
const translatorPhraseEl = document.getElementById("translator-phrase");
const resetBtn = document.getElementById("translator-reset");
const hiddenWordResult = document.getElementById("recognize-word-result");
const hiddenWordButton = document.getElementById("recognize-word-btn");
const listeningStatusEl = document.getElementById("translator-listening-status");
const recognizeWordBtn = document.getElementById("translator-recognize-btn");

let phraseWords = [];
const MAX_PHRASE_WORDS = 4;

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
      listeningStatusEl.textContent = "No se vio bien tu mano y tu cara - probá de nuevo";
      return;
    }

    if (!text) return;

    if (!text.includes("(")) {
      // Any other message from recognize.js we don't have specific
      // handling for (e.g. "Entrená el modelo de palabras primero" if
      // the model failed to load from IndexedDB, which can happen in
      // private/incognito browsing on iOS Safari) - show it instead of
      // silently ignoring it, so failures are never invisible.
      listeningStatusEl.textContent = text;
      return;
    }

    const word = text.split(" (")[0];
    const confidenceMatch = text.match(/\(([\d.]+)%\)/);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0;

    const CONFIDENCE_THRESHOLD = 75;

    if (confidence < CONFIDENCE_THRESHOLD) {
      listeningStatusEl.textContent = "🤔 No estoy segura - probá de nuevo";
      return;
    }

    translatorOutputEl.textContent = word;
    phraseWords.push(word);
    if (phraseWords.length > MAX_PHRASE_WORDS) phraseWords.shift();
    translatorPhraseEl.textContent = phraseWords.join(", ");

    speakText(word);
    listeningStatusEl.textContent = "";
  });

  observer.observe(hiddenWordResult, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

recognizeWordBtn.addEventListener("click", async () => {
  if (recognizeWordBtn.disabled) return;

  recognizeWordBtn.disabled = true;
  listeningStatusEl.textContent = "";

  try {
    await recognizeWord();
  } catch (error) {
    console.error("Error al traducir la seña:", error);
    listeningStatusEl.textContent = "Ocurrió un error - probá de nuevo";
  } finally {
    recognizeWordBtn.disabled = false;
  }
});

resetBtn.addEventListener("click", () => {
  phraseWords = [];
  translatorPhraseEl.textContent = "—";
  translatorOutputEl.textContent = "—";
});

watchForWordResult();