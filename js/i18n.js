// Translation dictionary. Add new keys here as the app grows.
const translations = {
  en: {
    title: "CodeMate Sign Translator",
    subtitle: "Step 1: turning on the webcam",
    statusWaiting: "Waiting for camera permission...",
    statusActive: "Camera active",
    statusError: "Could not access the camera. Check your browser permissions.",
    modelWaiting: "Loading hand detection model...",
    modelReady: "Model ready! Show your hand to the camera.",
    modelDetecting: "Hand detected!",
    modelNoHand: "No hand detected",
  },
  es: {
    title: "CodeMate Sign Translator",
    subtitle: "Paso 1: prender la webcam",
    statusWaiting: "Esperando permiso de cámara...",
    statusActive: "Cámara activa",
    statusError: "No se pudo acceder a la cámara. Revisá los permisos del navegador.",
    modelWaiting: "Cargando el modelo de detección de manos...",
    modelReady: "¡Modelo listo! Mostrale tu mano a la cámara.",
    modelDetecting: "¡Mano detectada!",
    modelNoHand: "No se detecta ninguna mano",
  },
};

let currentLang = localStorage.getItem("lang") || "en";

function applyTranslations() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (translations[currentLang][key]) {
      element.textContent = translations[currentLang][key];
    }
  });

  const toggleButton = document.getElementById("lang-toggle");
  toggleButton.textContent = currentLang === "en" ? "ES" : "EN";
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  applyTranslations();
}

document.getElementById("lang-toggle").addEventListener("click", () => {
  const nextLang = currentLang === "en" ? "es" : "en";
  setLanguage(nextLang);
});

applyTranslations();