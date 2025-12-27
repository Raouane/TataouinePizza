import { useState } from "react";

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
}

export function ImageWithFallback({ 
  src, 
  alt, 
  fallback = <span className="text-3xl">🍕</span>,
  className = ""
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || src.trim() === "" || hasError) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

