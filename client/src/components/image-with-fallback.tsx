import { useState } from "react";

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Normalise l'URL de l'image pour gérer les URLs relatives et absolues
 */
function normalizeImageUrl(src: string | undefined | null): string | null {
  if (!src || src.trim() === "") return null;
  
  const trimmed = src.trim();
  
  // Si l'URL commence par http://, https:// ou //, utiliser telle quelle
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("//")) {
    return trimmed;
  }
  
  // Si l'URL commence par /, ajouter l'origine
  if (trimmed.startsWith("/")) {
    return `${window.location.origin}${trimmed}`;
  }
  
  // Sinon, ajouter l'origine avec un /
  return `${window.location.origin}/${trimmed}`;
}

export function ImageWithFallback({ 
  src, 
  alt, 
  fallback = <span className="text-3xl">🍕</span>,
  className = ""
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedSrc = normalizeImageUrl(src);

  if (!normalizedSrc || hasError) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {fallback}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className={`absolute inset-0 bg-gradient-to-br from-orange-100 to-red-100 animate-pulse`} />
      )}
      <img
        src={normalizedSrc}
        alt={alt}
        className={className}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        loading="lazy"
      />
    </div>
  );
}

