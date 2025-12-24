import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Volume2, X } from "lucide-react";
import { grantAudioPermission, hasAudioPermission, requestNotificationPermission, hasNotificationPermission } from "@/lib/sound-utils";

export function AudioPermissionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    // Vérifier si les permissions ont déjà été accordées
    const audioGranted = hasAudioPermission();
    const notificationGranted = hasNotificationPermission();
    
    // Afficher la bannière si au moins une permission n'est pas accordée
    if (!audioGranted || !notificationGranted) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = async () => {
    setRequestingPermission(true);
    
    // Demander les deux permissions
    grantAudioPermission();
    
    // Demander la permission des notifications système
    if (!hasNotificationPermission()) {
      await requestNotificationPermission();
    }
    
    setRequestingPermission(false);
    setShowBanner(false);
  };

  const handleDecline = () => {
    setShowBanner(false);
    // Ne pas sauvegarder le refus pour permettre de redemander plus tard
  };

  if (!showBanner) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 shadow-lg border-2 border-orange-500 bg-white">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="bg-orange-100 p-2 rounded-full">
              <Volume2 className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Activer les notifications</h3>
              <p className="text-xs text-muted-foreground">
                Recevez des alertes sonores et des notifications système même quand l'application est en arrière-plan. Vous pouvez désactiver cela à tout moment.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDecline}
            className="h-6 w-6 p-0 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAccept}
            disabled={requestingPermission}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            size="sm"
          >
            {requestingPermission ? "Activation..." : "Activer"}
          </Button>
          <Button
            onClick={handleDecline}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Plus tard
          </Button>
        </div>
      </div>
    </Card>
  );
}

