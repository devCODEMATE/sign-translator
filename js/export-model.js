// Exports the trained models (currently only in IndexedDB, tied to
// this browser) as downloadable files: model.json + weights.bin for
// each model, plus the classes and normalization stats as JSON. These
// get committed to the repo so GitHub Pages serves them as static
// files - any device can then load the same trained model, not just
// the browser that ran the training.

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

document.getElementById("export-letters-btn").addEventListener("click", async () => {
  const statusEl = document.getElementById("export-status");

  if (!loadedLetterModel || !loadedLetterClasses) {
    statusEl.textContent = "No hay modelo de letras cargado.";
    return;
  }

  await loadedLetterModel.save("downloads://letter-model");
  downloadJSON(loadedLetterClasses, "letter-classes.json");

  statusEl.textContent = "Letras exportadas: letter-model.json, letter-model.weights.bin, letter-classes.json";
});

document.getElementById("export-words-btn").addEventListener("click", async () => {
  const statusEl = document.getElementById("export-status");

  if (!loadedWordModel || !loadedWordClasses) {
    statusEl.textContent = "No hay modelo de palabras cargado.";
    return;
  }

  await loadedWordModel.save("downloads://word-model");
  downloadJSON(loadedWordClasses, "word-classes.json");
  downloadJSON({ means: loadedWordMeans, stds: loadedWordStds }, "word-feature-stats.json");

  statusEl.textContent = "Palabras exportadas: word-model.json, word-model.weights.bin, word-classes.json, word-feature-stats.json";
});