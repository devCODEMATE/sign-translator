<div align="center">

# `<CodeMate>` Sign Translator

**Traductor de Lengua de Señas Argentina (LSA) en tiempo real, 100% en el navegador**
**Real-time Argentine Sign Language (LSA) translator, 100% in-browser**

🌐 [Demo en vivo / Live demo](https://devcodemate.github.io/sign-translator/translator.html) · 💻 [Repo](https://github.com/devCODEMATE/sign-translator) · 🏆 CoderCup — Coderhouse AI Builders Program

🇦🇷 [Español](#-español) | 🇬🇧 [English](#-english)

</div>

---

## 🇦🇷 Español

### El problema

¿Cómo hace alguien que no sabe Lengua de Señas Argentina (LSA) para entender a alguien que sí la usa, en el momento, sin instalar nada y sin depender de un traductor humano? Esa fue la pregunta que arrancó este proyecto.

CodeMate Sign Translator es un traductor de LSA que corre **enteramente en el navegador**, sin backend, sin servidores, sin enviar video a ningún lado. Todo el reconocimiento pasa en tu propio dispositivo.

### Cómo funciona

El sistema usa dos modelos de IA corriendo en paralelo sobre tu cámara:

- **[handpose](https://github.com/tensorflow/tfjs-models/tree/master/handpose)** (TensorFlow.js) — detecta los 21 puntos clave de la mano
- **[blazeface](https://github.com/tensorflow/tfjs-models/tree/master/blazeface)** (TensorFlow.js) — detecta la posición del rostro, usada como referencia espacial

A partir de esos puntos, dos clasificadores propios (entrenados con `tf.sequential()` y exportados como archivos estáticos en `/models`, sin depender de IndexedDB) reconocen:

- **Letras** (deletreo, gesto estático): A, B, C, F, I, M, R, U — ~86% accuracy
- **Palabras** (gesto dinámico, ventana de 30 frames, 65 features por frame combinando forma de mano normalizada + posición de muñeca relativa al rostro): Hola, Chau, Por favor, Permiso, Gracias — 85-95% accuracy según la palabra

La pantalla del traductor (`translator.html`) tiene un modo manual: hacés la seña, apretás "Traducir seña", se va armando una frase acumulativa, y al final se lee en voz alta con `SpeechSynthesis`. Probado y funcionando en computadora y en celular (iOS Safari incluido, con el manejo del audio-unlock que iOS requiere).

### Cómo usarlo

1. Entrá a la [demo en vivo](https://devcodemate.github.io/sign-translator/translator.html)
2. Dale permiso a la cámara
3. Hacé una letra o palabra en LSA frente a la cámara
4. Apretá "Traducir seña" para agregarla a la frase
5. Repetí para armar una frase completa
6. Escuchá la frase leída en voz alta

No requiere instalación, cuenta, ni conexión a un backend — todo el procesamiento es local.

### Stack técnico

- Vanilla JavaScript (sin frameworks)
- TensorFlow.js (`handpose` + `blazeface`)
- Modelos propios entrenados con `tf.sequential()`, exportados como archivos estáticos
- `SpeechSynthesis` API para la salida de voz
- Sin backend — deploy en GitHub Pages

### El camino: cómo se construyó

El proyecto arrancó como una exploración de TensorFlow.js apuntando solo a deletreo de letras. En el camino se sumó el reconocimiento de palabras completas, lo cual requirió pasar de un enfoque de "gesto estático" a uno de "secuencia de movimiento" — ventanas de 30 frames con 65 features cada una, combinando la forma de la mano normalizada con la posición de la muñeca relativa al rostro.

Algunos de los problemas técnicos más importantes que aparecieron y se resolvieron:

- **CDN de blazeface roto**: una versión específica del CDN dejó de funcionar a mitad de desarrollo, hubo que fijar la versión correcta.
- **Memory leaks de WebGL**: tensores no descartados (`dispose()`) iban acumulando memoria de GPU hasta trabar el navegador en sesiones largas.
- **Bug de sincronización modelo-reconocimiento**: el modelo predecía sobre frames viejos si no se sincronizaba bien el loop de captura con el de inferencia.
- **Desajuste de escala de features**: las features de forma de mano y posición de muñeca tenían rangos muy distintos, lo que arruinaba el entrenamiento hasta estandarizarlas.

Durante el proceso se sacaron dos elementos del alcance inicial: la letra **P** (baja precisión, muy confundible con otras letras) y la palabra **"Buenos días"** (requiere dos manos, y el modelo actual solo soporta una mano a la vez).

### Limitaciones conocidas

Documentadas a propósito — son parte de la narrativa honesta de este proyecto, no un detalle menor:

- **El modelo fue entrenado con una sola persona (yo).** No generaliza bien a otras manos — lo confirmé probándolo con una amiga, con resultados notoriamente peores que en mis propias pruebas.
- **Es sensible a la cámara y al dispositivo.** El mismo gesto puede reconocerse distinto en celular vs. computadora, por diferencias de resolución y lente.
- **`handpose` es un modelo de 2020.** A veces confunde patrones faciales con patrones de mano, sobre todo con mala iluminación.
- **Hay confusiones puntuales documentadas entre letras**, por ejemplo entre U y B, registradas en la matriz de confusión del entrenamiento.

### Roadmap — próximos pasos

- [ ] Migrar de `handpose` a [`hand-pose-detection`](https://github.com/tensorflow/tfjs-models/tree/master/hand-pose-detection) (MediaPipe), más preciso y con mantenimiento activo
- [ ] Entrenar con datos de múltiples personas para mejorar la generalización
- [ ] Sumar más letras y palabras al vocabulario reconocido
- [ ] Soporte para señas de dos manos (como "Buenos días")
- [ ] Mejorar la robustez ante distintas condiciones de cámara/iluminación

### Sobre este proyecto

Este proyecto fue desarrollado como entrega para la **CoderCup** de Coderhouse (AI Builders Program) por **Flo (Lia Florencia Cervini)** — desarrolladora frontend junior en transición desde 13+ años de marketing digital y gestión pública. Podés seguir el proceso completo en [GitHub](https://github.com/devCODEMATE).

---

## 🇬🇧 English

### The problem

How can someone who doesn't know Argentine Sign Language (LSA) understand someone who does, in real time, without installing anything and without relying on a human interpreter? That question is what started this project.

CodeMate Sign Translator is an LSA translator that runs **entirely in the browser** — no backend, no servers, no video ever leaves your device. All recognition happens locally.

### How it works

The system runs two AI models in parallel on your camera feed:

- **[handpose](https://github.com/tensorflow/tfjs-models/tree/master/handpose)** (TensorFlow.js) — detects the 21 hand keypoints
- **[blazeface](https://github.com/tensorflow/tfjs-models/tree/master/blazeface)** (TensorFlow.js) — detects face position, used as a spatial reference

From those keypoints, two custom classifiers (trained with `tf.sequential()` and exported as static files in `/models`, with no IndexedDB dependency) recognize:

- **Letters** (fingerspelling, static gesture): A, B, C, F, I, M, R, U — ~86% accuracy
- **Words** (dynamic gesture, 30-frame window, 65 features per frame combining normalized hand shape + wrist position relative to the face): Hola, Chau, Por favor, Permiso, Gracias — 85-95% accuracy depending on the word

The translator screen (`translator.html`) has a manual mode: perform the sign, press "Traducir seña", it gets added to an accumulating sentence, and the full sentence is read aloud via `SpeechSynthesis`. Tested and working on both desktop and mobile (including iOS Safari, with the audio-unlock handling iOS requires).

### How to use it

1. Open the [live demo](https://devcodemate.github.io/sign-translator/translator.html)
2. Grant camera permission
3. Perform an LSA letter or word in front of the camera
4. Press "Traducir seña" to add it to the sentence
5. Repeat to build a full sentence
6. Listen to the sentence read aloud

No installation, no account, no backend connection required — all processing is local.

### Tech stack

- Vanilla JavaScript (no frameworks)
- TensorFlow.js (`handpose` + `blazeface`)
- Custom models trained with `tf.sequential()`, exported as static files
- `SpeechSynthesis` API for voice output
- No backend — deployed on GitHub Pages

### The journey: how it was built

The project started as a TensorFlow.js exploration focused only on letter fingerspelling. Along the way, full-word recognition was added, which meant moving from a "static gesture" approach to a "motion sequence" one — 30-frame windows with 65 features each, combining normalized hand shape with wrist position relative to the face.

Some of the key technical problems that came up and were solved:

- **Broken blazeface CDN version**: a specific CDN version stopped working mid-development; had to pin the correct one.
- **WebGL memory leaks**: undisposed tensors kept accumulating GPU memory until the browser froze during long sessions.
- **Model-recognition sync bug**: the model would predict on stale frames if the capture loop and inference loop weren't properly synced.
- **Feature scale mismatch**: hand-shape and wrist-position features had very different ranges, which broke training until they were standardized.

Two elements were cut from the original scope along the way: the letter **P** (low precision, too easily confused with other letters) and the word **"Buenos días"** (requires two hands, and the current model only supports single-hand recognition).

### Known limitations

Documented on purpose — this is part of the project's honest narrative, not a footnote:

- **The model was trained on a single person (me).** It doesn't generalize well to other hands — confirmed by testing it with a friend, with noticeably worse results than in my own tests.
- **It's sensitive to camera and device.** The same gesture can be recognized differently on mobile vs. desktop, due to resolution and lens differences.
- **`handpose` is a 2020 model.** It sometimes confuses facial patterns with hand patterns, especially in poor lighting.
- **There are documented letter-level confusions**, for example between U and B, recorded in the training confusion matrix.

### Roadmap — what's next

- [ ] Migrate from `handpose` to [`hand-pose-detection`](https://github.com/tensorflow/tfjs-models/tree/master/hand-pose-detection) (MediaPipe), more accurate and actively maintained
- [ ] Train on data from multiple people to improve generalization
- [ ] Add more letters and words to the recognized vocabulary
- [ ] Support two-handed signs (like "Buenos días")
- [ ] Improve robustness across different camera/lighting conditions

### About this project

This project was built as a submission for **CoderCup** at Coderhouse (AI Builders Program) by **Flo (Lia Florencia Cervini)** — a junior frontend developer transitioning from 13+ years in digital marketing and public administration. Follow the full journey on [GitHub](https://github.com/devCODEMATE).

---

<div align="center">

<img src="assets/codemate-sticker.jpeg" alt="CodeMate sticker" width="180" />

Hecho con 🧉 en La Plata, Argentina — Made with 🧉 in La Plata, Argentina

**`<CodeMate>`**

</div>