import { useState } from "react";

interface PizzaImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function PizzaImage({ src, alt, className = "", fallback }: PizzaImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Normaliser l'URL : si elle commence par http, utiliser telle quelle, sinon préfixer avec l'origine
  const normalizedSrc = src && src.trim() !== "" 
    ? (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//"))
      ? src
      : `${window.location.origin}${src.startsWith("/") ? "" : "/"}${src}`
    : null;

  // Logs pour déboguer les images
  if (normalizedSrc && typeof window !== 'undefined') {
    console.log(`[PizzaImage] 🖼️  Image pour "${alt}":`);
    console.log(`[PizzaImage]   Source originale: ${src}`);
    console.log(`[PizzaImage]   URL normalisée: ${normalizedSrc}`);
    console.log(`[PizzaImage]   Origin: ${window.location.origin}`);
  }

  if (!normalizedSrc || hasError) {
    if (normalizedSrc) {
      console.error(`[PizzaImage] ❌ Erreur chargement image: ${normalizedSrc}`);
    } else {
      console.warn(`[PizzaImage] ⚠️  Pas de source pour "${alt}"`);
    }
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-red-100 ${className}`}>
        {fallback || <span className="text-6xl md:text-7xl">🍕</span>}
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={`w-full h-full object-cover hover:scale-105 transition-transform duration-300 ${className}`}
      onLoad={() => {
        setIsLoading(false);
        console.log(`[PizzaImage] ✅ Image chargée avec succès: ${normalizedSrc}`);
      }}
      onError={(e) => {
        setIsLoading(false);
        setHasError(true);
        console.error(`[PizzaImage] ❌ Erreur chargement image: ${normalizedSrc}`);
        console.error(`[PizzaImage]   Event:`, e);
      }}
      loading="lazy"
    />
  );
}



