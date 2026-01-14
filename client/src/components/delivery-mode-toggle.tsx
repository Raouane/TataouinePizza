import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePublicSetting } from "@/hooks/use-app-settings";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * Composant pour basculer entre les modes de livraison
 * - Si admin : modifie le setting global
 * - Sinon : bascule la vue localement (localStorage)
 */
export function DeliveryModeToggle() {
  const { token, isAuthenticated: isAdmin } = useAdminAuth();
  const { t } = useLanguage();
  const globalSetting = usePublicSetting("delivery_modes_enabled", "true");
  const [localEnabled, setLocalEnabled] = useState<boolean | null>(null);
  const [updating, setUpdating] = useState(false);

  // Initialiser depuis localStorage ou le setting global
  useEffect(() => {
    const localValue = localStorage.getItem("delivery_modes_enabled");
    if (localValue !== null) {
      setLocalEnabled(localValue === "true");
    } else {
      setLocalEnabled(globalSetting === "true");
    }
  }, [globalSetting]);

  const handleToggle = async (enabled: boolean) => {
    // Toujours basculer localement d'abord (pour que ça fonctionne immédiatement)
    setLocalEnabled(enabled);
    localStorage.setItem("delivery_modes_enabled", enabled ? "true" : "false");
    
    // Si admin, essayer de mettre à jour le setting global aussi
    if (isAdmin && token) {
      setUpdating(true);
      try {
        const response = await fetch("/api/admin/settings/delivery_modes_enabled", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            value: enabled ? "true" : "false",
            description: "Active ou désactive la page des modes de livraison sur la page d'accueil",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          toast.success(
            enabled
              ? t('delivery.toggle.activated')
              : t('delivery.toggle.deactivated')
          );
        } else {
          // Si l'API échoue, on continue quand même avec le mode local
          console.warn("Impossible de mettre à jour le setting global, utilisation du mode local");
          toast.success(
            enabled
              ? t('delivery.toggle.localEnabled')
              : t('delivery.toggle.localDisabled')
          );
        }
      } catch (error) {
        // Si erreur, on continue avec le mode local
        console.warn("Erreur lors de la mise à jour du setting global:", error);
        toast.success(
          enabled
            ? t('delivery.toggle.localEnabled')
            : t('delivery.toggle.localDisabled')
        );
      } finally {
        setUpdating(false);
      }
    } else {
      // Utilisateur normal : basculer localement uniquement
      toast.success(
        enabled
          ? t('delivery.toggle.localEnabled')
          : t('delivery.toggle.localDisabled')
      );
    }
    
    // Recharger la page pour appliquer le changement
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  if (localEnabled === null) {
    return null; // En attente du chargement
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="delivery-toggle" className="text-xs text-muted-foreground cursor-pointer">
        {localEnabled ? t('delivery.toggle.modeLivraison') : t('delivery.toggle.modeRestaurants')}
      </Label>
      {updating ? (
        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
      ) : (
        <Switch
          id="delivery-toggle"
          checked={localEnabled}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-orange-500"
        />
      )}
    </div>
  );
}
