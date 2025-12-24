import { useState, useRef, useEffect } from "react";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeButtonProps {
  onSwipe: () => void;
  disabled?: boolean;
  label: string;
  icon?: React.ReactNode;
  color?: "green" | "orange" | "emerald";
  className?: string;
}

const SWIPE_THRESHOLD = 150; // Distance minimale pour déclencher le swipe

export function SwipeButton({
  onSwipe,
  disabled = false,
  label,
  icon,
  color = "green",
  className,
}: SwipeButtonProps) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const isSwipingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const buttonRef = useRef<HTMLDivElement>(null);

  const colorClasses = {
    green: "bg-green-600",
    orange: "bg-orange-600",
    emerald: "bg-emerald-600",
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    console.log("[SwipeButton] 🎯 TouchStart appelé - disabled:", disabled);
    if (disabled) {
      console.log("[SwipeButton] TouchStart - Désactivé");
      return;
    }
    
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    isSwipingRef.current = true;
    console.log("[SwipeButton] ✅ TouchStart - Position:", touch.clientX, touch.clientY);
    e.stopPropagation(); // Empêcher la propagation vers les parents
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isSwipingRef.current) {
      return;
    }
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = Math.abs(touch.clientY - startYRef.current);
    
    // Ne permettre le swipe que si le mouvement horizontal est plus important que vertical
    if (deltaY > 50 && deltaX < 50) {
      // Mouvement trop vertical, annuler le swipe
      console.log("[SwipeButton] Mouvement vertical détecté - Annulation");
      isSwipingRef.current = false;
      setSwipeProgress(0);
      return;
    }
    
    // Empêcher le scroll seulement si on swipe horizontalement
    if (deltaX > 10) {
      e.preventDefault();
    }
    
    if (deltaX > 0) {
      const progress = Math.min((deltaX / SWIPE_THRESHOLD) * 100, 100);
      setSwipeProgress(progress);
      console.log("[SwipeButton] TouchMove - DeltaX:", deltaX.toFixed(0), "Progression:", progress.toFixed(0) + "%");
    } else {
      // Mouvement vers la gauche, réinitialiser
      setSwipeProgress(0);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled || !isSwipingRef.current) {
      return;
    }
    
    const finalProgress = swipeProgress;
    console.log("[SwipeButton] TouchEnd - Progression finale:", finalProgress.toFixed(0) + "%");
    
    if (finalProgress >= 100) {
      console.log("[SwipeButton] ✅ Swipe complété - Action déclenchée");
      onSwipe();
      // Animation de succès
      setTimeout(() => {
        setSwipeProgress(0);
        isSwipingRef.current = false;
      }, 300);
    } else {
      // Retour animé
      console.log("[SwipeButton] ⏪ Retour - Swipe incomplet");
      setSwipeProgress(0);
      isSwipingRef.current = false;
    }
  };

  // Gestionnaires pour événements souris (desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    console.log("[SwipeButton] 🖱️ MouseDown - Simulation touch sur desktop");
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isSwipingRef.current = true;
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled || !isSwipingRef.current) return;
    
    const deltaX = e.clientX - startXRef.current;
    const deltaY = Math.abs(e.clientY - startYRef.current);
    
    // Ne permettre le swipe que si le mouvement horizontal est plus important que vertical
    if (deltaY > 50 && deltaX < 50) {
      isSwipingRef.current = false;
      setSwipeProgress(0);
      return;
    }
    
    if (deltaX > 0) {
      const progress = Math.min((deltaX / SWIPE_THRESHOLD) * 100, 100);
      setSwipeProgress(progress);
      console.log("[SwipeButton] MouseMove - DeltaX:", deltaX.toFixed(0), "Progression:", progress.toFixed(0) + "%");
    } else {
      setSwipeProgress(0);
    }
  };

  const handleMouseUp = () => {
    if (disabled || !isSwipingRef.current) return;
    
    const finalProgress = swipeProgress;
    console.log("[SwipeButton] MouseUp - Progression finale:", finalProgress.toFixed(0) + "%");
    
    if (finalProgress >= 100) {
      console.log("[SwipeButton] ✅ Swipe complété (souris) - Action déclenchée");
      onSwipe();
      setTimeout(() => {
        setSwipeProgress(0);
        isSwipingRef.current = false;
      }, 300);
    } else {
      console.log("[SwipeButton] ⏪ Retour (souris) - Swipe incomplet");
      setSwipeProgress(0);
      isSwipingRef.current = false;
    }
  };

  // Log au montage pour vérifier que le composant est rendu
  useEffect(() => {
    console.log("[SwipeButton] 🎨 Composant monté - Label:", label, "Disabled:", disabled);
    console.log("[SwipeButton] 🎨 Référence du bouton:", buttonRef.current);
    console.log("[SwipeButton] 🎨 Position du bouton:", buttonRef.current?.getBoundingClientRect());
    
    // Attacher les événements touch directement sur l'élément DOM (mobile)
    const buttonElement = buttonRef.current;
    if (!buttonElement) return;
    
    const handleNativeTouchStart = (e: TouchEvent) => {
      console.log("[SwipeButton] 🎯 Native TouchStart appelé!");
      handleTouchStart(e as any);
    };
    
    const handleNativeTouchMove = (e: TouchEvent) => {
      handleTouchMove(e as any);
    };
    
    const handleNativeTouchEnd = (e: TouchEvent) => {
      handleTouchEnd(e as any);
    };
    
    // Gestionnaires souris globaux pour le drag (desktop)
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isSwipingRef.current && buttonElement) {
        const deltaX = e.clientX - startXRef.current;
        const deltaY = Math.abs(e.clientY - startYRef.current);
        
        if (deltaY > 50 && deltaX < 50) {
          isSwipingRef.current = false;
          setSwipeProgress(0);
          return;
        }
        
        if (deltaX > 0) {
          const progress = Math.min((deltaX / SWIPE_THRESHOLD) * 100, 100);
          setSwipeProgress(progress);
        } else {
          setSwipeProgress(0);
        }
      }
    };
    
    const handleGlobalMouseUp = () => {
      if (isSwipingRef.current) {
        const finalProgress = swipeProgress;
        if (finalProgress >= 100) {
          onSwipe();
          setTimeout(() => {
            setSwipeProgress(0);
            isSwipingRef.current = false;
          }, 300);
        } else {
          setSwipeProgress(0);
          isSwipingRef.current = false;
        }
      }
    };
    
    buttonElement.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    buttonElement.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    buttonElement.addEventListener('touchend', handleNativeTouchEnd);
    
    // Événements souris globaux pour le drag
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      buttonElement.removeEventListener('touchstart', handleNativeTouchStart);
      buttonElement.removeEventListener('touchmove', handleNativeTouchMove);
      buttonElement.removeEventListener('touchend', handleNativeTouchEnd);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [disabled, label, swipeProgress, onSwipe]);

  // Réinitialiser si disabled change
  useEffect(() => {
    if (disabled) {
      setSwipeProgress(0);
      isSwipingRef.current = false;
    }
  }, [disabled, label]);

  // Test de clic pour vérifier que le composant est interactif
  const handleClick = () => {
    console.log("[SwipeButton] 🖱️ Click détecté - Le composant est interactif!");
  };

  return (
    <div
      ref={buttonRef}
      className={cn(
        "relative w-full h-14 rounded-lg overflow-hidden select-none",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-grab active:cursor-grabbing",
        className
      )}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      // Les événements touch sont gérés par addEventListener dans useEffect
      style={{
        touchAction: 'none', // Bloquer tous les gestes par défaut pour gérer manuellement
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        position: 'relative',
        zIndex: 10, // S'assurer que le bouton est au-dessus
      }}
    >
      {/* Fond principal */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-between px-6 transition-opacity duration-200",
          colorClasses[color],
          swipeProgress > 0 && "opacity-90"
        )}
        style={{
          transform: `translateX(${-swipeProgress * 0.1}px)`,
          transition: swipeProgress > 0 ? "none" : "transform 0.3s ease-out",
        }}
      >
        <div className="flex items-center gap-3">
          {icon || <Check className="w-5 h-5 text-white" />}
          <span className="text-white font-semibold text-base">{label}</span>
        </div>
        <ArrowRight className="w-5 h-5 text-white/80" />
      </div>

      {/* Indicateur de progression */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          colorClasses[color],
          "opacity-30"
        )}
        style={{
          width: `${swipeProgress}%`,
          transition: swipeProgress > 0 ? "none" : "width 0.3s ease-out",
        }}
      />

      {/* Texte de glissement */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-white font-semibold text-sm transition-opacity duration-200"
          style={{ opacity: swipeProgress / 100 }}
        >
          Glisser pour {label.toLowerCase()}
        </span>
      </div>

      {/* Barre de progression en bas */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-white/50 transition-all duration-200"
        style={{
          width: `${swipeProgress}%`,
        }}
      />
    </div>
  );
}
