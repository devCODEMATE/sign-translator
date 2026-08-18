// Step 4a: train a letter classifier from captured hand-pose samples.
//
// IMPORTANT DATA NOTE: letter samples were captured as RAW landmark
// coordinates (absolute pixel positions in the video frame), not
// normalized to the wrist - unlike word samples, which were already
// normalized at capture time. If we fed raw coordinates straight to
// the model, it would partly learn "where in the frame was my hand"
// instead of "what shape was my hand" - fragile if positioning varies
// even slightly between recording and live use. We fix this here, at
// training time, without needing to re-record anything.

const LETTER_MODEL_STORAGE_KEY = "indexeddb://sign-translator-letter-model";

function normalizeLetterLandmarks(flatLandmarks) {
  // flatLandmarks is 63 numbers: 21 points of [x, y, z], flattened.
  const points = [];
  for (let i = 0; i < flatLandmarks.length; i += 3) {
    points.push([flatLandmarks[i], flatLandmarks[i + 1], flatLandmarks[i + 2]]);
  }

  const wrist = points[0];

  return points.flatMap(([x, y, z]) => [x - wrist[0], y - wrist[1], z - wrist[2]]);
}

function buildLetterDataset() {
  const letters = [...new Set(capturedSamples.map((s) => s.letter))].sort();

  const xs = [];
  const ys = [];

  capturedSamples.forEach((sample) => {
    xs.push(normalizeLetterLandmarks(sample.landmarks));
    ys.push(letters.indexOf(sample.letter));
  });

  return { xs, ys, letters };
}

// Randomly splits data into train/test sets, so we can check accuracy
// on examples the model never saw during training.
function trainTestSplit(xs, ys, testRatio = 0.2) {
  const indices = xs.map((_, i) => i);

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const testSize = Math.floor(xs.length * testRatio);
  const testIndices = indices.slice(0, testSize);
  const trainIndices = indices.slice(testSize);

  const pick = (arr, idxs) => idxs.map((i) => arr[i]);

  return {
    trainXs: pick(xs, trainIndices),
    trainYs: pick(ys, trainIndices),
    testXs: pick(xs, testIndices),
    testYs: pick(ys, testIndices),
  };
}

async function trainLetterModel() {
  const logEl = document.getElementById("letters-training-log");
  const trainButton = document.getElementById("train-letters-btn");

  trainButton.disabled = true;
  logEl.textContent = "Preparando datos...";

  const { xs, ys, letters } = buildLetterDataset();

  if (xs.length < 20) {
    logEl.textContent = "Necesitás más muestras antes de entrenar.";
    trainButton.disabled = false;
    return;
  }

  const { trainXs, trainYs, testXs, testYs } = trainTestSplit(xs, ys);

  const trainXsTensor = tf.tensor2d(trainXs);
  const trainYsTensor = tf.oneHot(tf.tensor1d(trainYs, "int32"), letters.length);
  const testXsTensor = tf.tensor2d(testXs);
  const testYsTensor = tf.oneHot(tf.tensor1d(testYs, "int32"), letters.length);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [63], units: 64, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: letters.length, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  logEl.textContent = "Entrenando...";

  await model.fit(trainXsTensor, trainYsTensor, {
    epochs: 60,
    batchSize: 8,
    validationSplit: 0.15,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        logEl.textContent = `Época ${epoch + 1}/60 — loss: ${logs.loss.toFixed(3)} — accuracy: ${logs.acc.toFixed(3)}`;
      },
    },
  });

  const evalResult = model.evaluate(testXsTensor, testYsTensor);
  const testAccuracy = (await evalResult[1].data())[0];
    evalResult[0].dispose();
  evalResult[1].dispose();

  // Per-letter breakdown - which letters does it get right vs confuse?
  const predictions = model.predict(testXsTensor);
  const predictedLabels = await predictions.argMax(-1).array();

  const perLetterCorrect = {};
  const perLetterTotal = {};
  letters.forEach((letter) => {
    perLetterCorrect[letter] = 0;
    perLetterTotal[letter] = 0;
  });

  testYs.forEach((actual, i) => {
    const letter = letters[actual];
    perLetterTotal[letter]++;
    if (predictedLabels[i] === actual) {
      perLetterCorrect[letter]++;
    }
  });

  const breakdown = letters
    .map((letter) => {
      const total = perLetterTotal[letter];
      const correct = perLetterCorrect[letter];
      return total > 0 ? `${letter}: ${correct}/${total}` : `${letter}: sin datos de test`;
    })
    .join(" &nbsp;|&nbsp; ");

  // Confusion matrix: rows = actual letter, columns = what the model
  // guessed instead. Reading it: "row C, column M" tells you how many
  // times a real C got misread as M.
  const confusion = {};
  letters.forEach((actualLetter) => {
    confusion[actualLetter] = {};
    letters.forEach((guessedLetter) => {
      confusion[actualLetter][guessedLetter] = 0;
    });
  });

  testYs.forEach((actual, i) => {
    const actualLetter = letters[actual];
    const guessedLetter = letters[predictedLabels[i]];
    confusion[actualLetter][guessedLetter]++;
  });

  let confusionTable = "<table class='confusion-table'><tr><th>Real \\ Predijo</th>";
  letters.forEach((letter) => {
    confusionTable += `<th>${letter}</th>`;
  });
  confusionTable += "</tr>";

  letters.forEach((actualLetter) => {
    confusionTable += `<tr><th>${actualLetter}</th>`;
    letters.forEach((guessedLetter) => {
      const count = confusion[actualLetter][guessedLetter];
      const isDiagonal = actualLetter === guessedLetter;
      const cellClass = count > 0 ? (isDiagonal ? "correct-cell" : "confused-cell") : "";
      confusionTable += `<td class="${cellClass}">${count || ""}</td>`;
    });
    confusionTable += "</tr>";
  });
  confusionTable += "</table>";

  logEl.innerHTML = `
    <strong>Accuracy en test: ${(testAccuracy * 100).toFixed(1)}%</strong><br>
    Por letra: ${breakdown}
    ${confusionTable}
  `;

  await model.save(LETTER_MODEL_STORAGE_KEY);
  window.letterModel = model;
  window.letterClasses = letters;
    localStorage.setItem("sign-translator-letter-classes", JSON.stringify(letters));

  console.log("Modelo de letras entrenado y guardado.", { testAccuracy, breakdown, letters });
await loadModelsForRecognition();

  trainXsTensor.dispose();
  trainYsTensor.dispose();
  testXsTensor.dispose();
  testYsTensor.dispose();
  predictions.dispose();

  trainButton.disabled = false;
}

document.getElementById("train-letters-btn").addEventListener("click", trainLetterModel);

// -----------------------------------------------------------------------
// Step 4b: train a word classifier from captured sequence samples.
// Each sample is a sequence of 30 frames x 65 features. We flatten each
// sequence into one long vector (1950 numbers) to feed a dense network -
// simpler than a proper sequence model (LSTM), and a reasonable
// trade-off given the time we have and how visually different these 5
// words' movements are from each other.
// -----------------------------------------------------------------------

const WORD_MODEL_STORAGE_KEY = "indexeddb://sign-translator-word-model";

function flattenSequence(sequence) {
  return sequence.flat();
}

function buildWordDataset() {
  const words = [...new Set(capturedWordSamples.map((s) => s.word))].sort();

  const xs = [];
  const ys = [];

  capturedWordSamples.forEach((sample) => {
    xs.push(flattenSequence(sample.sequence));
    ys.push(words.indexOf(sample.word));
  });

  return { xs, ys, words };
}

// Standardizes each of the 1950 features to have mean 0 and standard
// deviation 1, calculated from the training set. This fixes a scale
// mismatch in our data: hand-shape differences are raw pixel-sized
// numbers (can be in the hundreds), while face-relative position is
// already normalized to a tiny range (-1 to 1). Feeding that mix
// unscaled into a neural net causes unstable training - which is
// exactly the "collapses to predicting one class" symptom we saw in
// the first training run (20.8% accuracy, everything predicted as
// "porFavor").
function standardizeFeatures(trainXs, testXs) {
  const numFeatures = trainXs[0].length;
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(0);

  trainXs.forEach((row) => {
    row.forEach((value, i) => {
      means[i] += value / trainXs.length;
    });
  });

  trainXs.forEach((row) => {
    row.forEach((value, i) => {
      stds[i] += (value - means[i]) ** 2 / trainXs.length;
    });
  });

  for (let i = 0; i < numFeatures; i++) {
    stds[i] = Math.sqrt(stds[i]) || 1; // avoid divide-by-zero for constant features
  }

  const apply = (rows) =>
    rows.map((row) => row.map((value, i) => (value - means[i]) / stds[i]));

  return { trainXs: apply(trainXs), testXs: apply(testXs), means, stds };
}

async function trainWordModel() {
  const logEl = document.getElementById("words-training-log");
  const trainButton = document.getElementById("train-words-btn");

  trainButton.disabled = true;
  logEl.textContent = "Preparando datos...";

  const { xs, ys, words } = buildWordDataset();

  if (xs.length < 20) {
    logEl.textContent = "Necesitás más muestras antes de entrenar.";
    trainButton.disabled = false;
    return;
  }

  const inputSize = xs[0].length; // Should be 30 * 65 = 1950

  const { trainXs: rawTrainXs, trainYs, testXs: rawTestXs, testYs } = trainTestSplit(xs, ys);
  const { trainXs, testXs, means, stds } = standardizeFeatures(rawTrainXs, rawTestXs);

  // Save these so the live translator can apply the exact same
  // normalization to new predictions later - a model trained on
  // standardized data needs standardized input to work correctly.
  window.wordFeatureMeans = means;
  window.wordFeatureStds = stds;
    localStorage.setItem("sign-translator-word-feature-stats", JSON.stringify({ means, stds }));

  const trainXsTensor = tf.tensor2d(trainXs);
  const trainYsTensor = tf.oneHot(tf.tensor1d(trainYs, "int32"), words.length);
  const testXsTensor = tf.tensor2d(testXs);
  const testYsTensor = tf.oneHot(tf.tensor1d(testYs, "int32"), words.length);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [inputSize], units: 128, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.4 }));
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: words.length, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  logEl.textContent = "Entrenando...";

  await model.fit(trainXsTensor, trainYsTensor, {
    epochs: 80,
    batchSize: 8,
    validationSplit: 0.15,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        logEl.textContent = `Época ${epoch + 1}/80 — loss: ${logs.loss.toFixed(3)} — accuracy: ${logs.acc.toFixed(3)}`;
      },
    },
  });

  const evalResult = model.evaluate(testXsTensor, testYsTensor);
  const testAccuracy = (await evalResult[1].data())[0];
  evalResult[0].dispose();
  evalResult[1].dispose();

  const predictions = model.predict(testXsTensor);
  const predictedLabels = await predictions.argMax(-1).array();

  const perWordCorrect = {};
  const perWordTotal = {};
  words.forEach((word) => {
    perWordCorrect[word] = 0;
    perWordTotal[word] = 0;
  });

  testYs.forEach((actual, i) => {
    const word = words[actual];
    perWordTotal[word]++;
    if (predictedLabels[i] === actual) {
      perWordCorrect[word]++;
    }
  });

  const breakdown = words
    .map((word) => {
      const total = perWordTotal[word];
      const correct = perWordCorrect[word];
      return total > 0 ? `${word}: ${correct}/${total}` : `${word}: sin datos de test`;
    })
    .join(" &nbsp;|&nbsp; ");

  const confusion = {};
  words.forEach((actualWord) => {
    confusion[actualWord] = {};
    words.forEach((guessedWord) => {
      confusion[actualWord][guessedWord] = 0;
    });
  });

  testYs.forEach((actual, i) => {
    const actualWord = words[actual];
    const guessedWord = words[predictedLabels[i]];
    confusion[actualWord][guessedWord]++;
  });

  let confusionTable = "<table class='confusion-table'><tr><th>Real \\ Predijo</th>";
  words.forEach((word) => {
    confusionTable += `<th>${word}</th>`;
  });
  confusionTable += "</tr>";

  words.forEach((actualWord) => {
    confusionTable += `<tr><th>${actualWord}</th>`;
    words.forEach((guessedWord) => {
      const count = confusion[actualWord][guessedWord];
      const isDiagonal = actualWord === guessedWord;
      const cellClass = count > 0 ? (isDiagonal ? "correct-cell" : "confused-cell") : "";
      confusionTable += `<td class="${cellClass}">${count || ""}</td>`;
    });
    confusionTable += "</tr>";
  });
  confusionTable += "</table>";

  logEl.innerHTML = `
    <strong>Accuracy en test: ${(testAccuracy * 100).toFixed(1)}%</strong><br>
    Por palabra: ${breakdown}
    ${confusionTable}
  `;

  await model.save(WORD_MODEL_STORAGE_KEY);
  window.wordModel = model;
  window.wordClasses = words;
  localStorage.setItem("sign-translator-word-classes", JSON.stringify(words));
  console.log("Modelo de palabras entrenado y guardado.", { testAccuracy, breakdown, words });
  await loadModelsForRecognition();

  trainXsTensor.dispose();
  trainYsTensor.dispose();
  testXsTensor.dispose();
  testYsTensor.dispose();
  predictions.dispose();

  trainButton.disabled = false;
}

document.getElementById("train-words-btn").addEventListener("click", trainWordModel);