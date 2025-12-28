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

  if (!normalizedSrc || hasError) {
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
      onLoad={() => setIsLoading(false)}
      onError={() => {
        setIsLoading(false);
        setHasError(true);
      }}
      loading="lazy"
    />
  );
}


