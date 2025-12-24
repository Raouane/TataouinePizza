import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Enregistrer le Service Worker pour les notifications en arrière-plan
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] ✅ Service Worker enregistré avec succès:', registration.scope);
      })
      .catch((error) => {
        console.error('[SW] ❌ Erreur lors de l\'enregistrement du Service Worker:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
