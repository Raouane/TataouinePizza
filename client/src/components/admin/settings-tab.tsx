import { useState, useEffect } from "react";
import { useAppSettings } from "@/hooks/use-app-settings";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface SettingsTabProps {
  token: string | null;
}

export function SettingsTab({ token }: SettingsTabProps) {
  const { settings, loading, getSetting, refetch } = useAppSettings();
  const [deliveryModesEnabled, setDeliveryModesEnabled] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const value = getSetting("delivery_modes_enabled");
    setDeliveryModesEnabled(value === "true");
  }, [settings, getSetting]);

  const handleToggleDeliveryModes = async (enabled: boolean) => {
    if (!token) {
      toast.error("Non authentifié");
      return;
    }

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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors de la mise à jour");
      }

      setDeliveryModesEnabled(enabled);
      await refetch();
      toast.success(
        enabled
          ? "Modes de livraison activés"
          : "Modes de livraison désactivés"
      );
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise à jour du paramètre"
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration de l'application</CardTitle>
          <CardDescription>
            Gérez les paramètres globaux de l'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle pour les modes de livraison */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="delivery-modes" className="text-base font-semibold">
                Modes de livraison
              </Label>
              <p className="text-sm text-gray-500">
                {deliveryModesEnabled
                  ? "La page d'accueil affiche les modes de livraison (vélo, scooter, etc.)"
                  : "La page d'accueil affiche la liste des restaurants"}
              </p>
            </div>
            <Switch
              id="delivery-modes"
              checked={deliveryModesEnabled}
              onCheckedChange={handleToggleDeliveryModes}
              disabled={updating}
            />
          </div>

          {/* Info supplémentaire */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Note :</strong> Les changements prennent effet immédiatement. 
              Les utilisateurs verront la nouvelle page d'accueil lors de leur prochaine visite.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
