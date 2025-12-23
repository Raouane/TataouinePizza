import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Masquer le loader après que tout soit chargé
    const handleHide = () => {
      setIsVisible(false);
    };

    // Masquer aussi quand la page est complètement chargée
    if (document.readyState === "complete") {
      // Petit délai pour une transition fluide
      setTimeout(handleHide, 300);
    } else {
      window.addEventListener("load", () => {
        setTimeout(handleHide, 300);
      });
    }

    // Timeout de sécurité (max 3 secondes)
    const safetyTimer = setTimeout(handleHide, 3000);

    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener("load", handleHide);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center animate-in fade-out duration-300">
      <div className="text-center px-4">
        {/* Logo/Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-white text-4xl">🍕</span>
          </div>
        </div>

        {/* Message */}
        <p className="text-gray-700 text-lg font-medium mb-6">
          Chargement du site, merci de patienter quelques secondes…
        </p>

        {/* Spinner avec points animés */}
        <div className="flex justify-center gap-2">
          <div 
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" 
            style={{ animationDelay: "0s", animationDuration: "1.4s" }} 
          />
          <div 
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" 
            style={{ animationDelay: "0.2s", animationDuration: "1.4s" }} 
          />
          <div 
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" 
            style={{ animationDelay: "0.4s", animationDuration: "1.4s" }} 
          />
        </div>
      </div>
    </div>
  );
}

