import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { reverseGeocodeFull, type ReverseGeocodeResult } from "@/hooks/use-onboarding";
import { toast } from "sonner";

// ✅ IMPORT STATIQUE pour garantir que React est dans le même contexte
// Cela augmente le bundle initial mais garantit la compatibilité avec React 19
import L from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix pour les icônes Leaflet en production
delete (L as any).Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface AddressPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCoords?: { lat: number; lng: number } | null;
  onAddressSelected: (address: {
    coords: { lat: number; lng: number };
    fullAddress: string;
    street: string;
    city: string;
    country: string;
  }) => void;
}

// Coordonnées par défaut : Tataouine
const DEFAULT_CENTER: [number, number] = [32.9297, 10.4511];
const DEFAULT_ZOOM = 15;

// Composant de carte avec imports statiques (garantit la compatibilité React 19)
interface MapComponentProps {
  center: [number, number];
  zoom: number;
  onMarkerDragEnd: (lat: number, lng: number) => void;
  markerPosition: [number, number];
  onMapClick: (lat: number, lng: number) => void;
}

const MapComponent = ({ center, zoom, onMarkerDragEnd, markerPosition, onMapClick }: MapComponentProps) => {
  const handleMapClick = (e: any) => {
    onMapClick(e.latlng.lat, e.latlng.lng);
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      key={`${center[0]}-${center[1]}`}
      eventHandlers={{
        click: handleMapClick,
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={markerPosition}
        draggable={true}
        eventHandlers={{
          dragend: (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            onMarkerDragEnd(lat, lng);
          },
        }}
      />
    </MapContainer>
  );
};

export function AddressPicker({
  open,
  onOpenChange,
  initialCoords,
  onAddressSelected,
}: AddressPickerProps) {
  const { t, language } = useLanguage();
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(DEFAULT_CENTER);
  const [address, setAddress] = useState<ReverseGeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Initialiser la position du marqueur
  useEffect(() => {
    if (open) {
      if (initialCoords) {
        const coords: [number, number] = [initialCoords.lat, initialCoords.lng];
        setMapCenter(coords);
        setMarkerPosition(coords);
        // Faire le reverse geocoding de la position initiale
        handleGeocode(initialCoords.lat, initialCoords.lng);
      } else {
        // Demander la géolocalisation si pas de coordonnées initiales
        requestCurrentLocation();
      }
    }
  }, [open, initialCoords]);

  // Demander la géolocalisation actuelle
  const requestCurrentLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error(
        t(
          "La géolocalisation n'est pas supportée par ce navigateur.",
          "Geolocation is not supported by your browser.",
          "المتصفح لا يدعم تحديد الموقع الجغرافي."
        )
      );
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMapCenter(coords);
        setMarkerPosition(coords);
        handleGeocode(coords[0], coords[1]);
        setLoading(false);
      },
      (error) => {
        let msg: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = t(
              "Permission de géolocalisation refusée.",
              "Geolocation permission denied.",
              "تم رفض إذن تحديد الموقع الجغرافي."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            msg = t(
              "Position indisponible.",
              "Position unavailable.",
              "الموقع غير متاح."
            );
            break;
          case error.TIMEOUT:
            msg = t(
              "Délai d'attente dépassé.",
              "Request timeout.",
              "انتهت مهلة الطلب."
            );
            break;
          default:
            msg = t(
              "Impossible de récupérer votre position.",
              "Unable to retrieve your location.",
              "تعذر الحصول على موقعك."
            );
            break;
        }
        toast.error(msg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [t]);

  // Reverse geocoding avec debounce pour respecter les limites Nominatim
  const handleGeocode = useCallback(
    async (lat: number, lng: number) => {
      setGeocoding(true);
      try {
        const result = await reverseGeocodeFull(lat, lng);
        if (result) {
          setAddress(result);
        } else {
          setAddress(null);
        }
      } catch (error) {
        console.error("[AddressPicker] Erreur de géocodage:", error);
        setAddress(null);
      } finally {
        setGeocoding(false);
      }
    },
    []
  );

  // Gérer le clic sur la carte
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      const newPosition: [number, number] = [lat, lng];
      setMarkerPosition(newPosition);
      setMapCenter(newPosition);
      handleGeocode(lat, lng);
    },
    [handleGeocode]
  );

  // Gérer le déplacement du marqueur avec debounce
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleMarkerDragEnd = useCallback(
    (lat: number, lng: number) => {
      const newPosition: [number, number] = [lat, lng];
      setMarkerPosition(newPosition);
      // Debounce pour éviter trop de requêtes (respecter les limites Nominatim)
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        handleGeocode(lat, lng);
      }, 500);
    },
    [handleGeocode]
  );

  // Confirmer la sélection
  const handleConfirm = useCallback(() => {
    if (!address) {
      toast.error(
        t(
          "Veuillez attendre le chargement de l'adresse.",
          "Please wait for the address to load.",
          "يرجى انتظار تحميل العنوان."
        )
      );
      return;
    }

    onAddressSelected({
      coords: {
        lat: markerPosition[0],
        lng: markerPosition[1],
      },
      fullAddress: address.fullAddress,
      street: address.street,
      city: address.city,
      country: address.country,
    });

    onOpenChange(false);
  }, [address, markerPosition, onAddressSelected, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
        <DialogHeader>
          <DialogTitle>
            {language === "ar"
              ? "اختر موقعك على الخريطة"
              : language === "en"
              ? "Choose your location on the map"
              : "Choisissez votre emplacement sur la carte"}
          </DialogTitle>
          <DialogDescription>
            {language === "ar"
              ? "انقر على la carte ou déplacez le marqueur pour sélectionner votre adresse de livraison"
              : language === "en"
              ? "Click on the map or drag the marker to select your delivery address"
              : "Cliquez sur la carte ou déplacez le marqueur pour sélectionner votre adresse de livraison"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Bouton de géolocalisation */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={requestCurrentLocation}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === "ar"
                    ? "جاري الحصول على الموقع..."
                    : language === "en"
                    ? "Getting location..."
                    : "Obtention de la position..."}
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-2" />
                  {language === "ar"
                    ? "استخدام موقعي الحالي"
                    : language === "en"
                    ? "Use my current location"
                    : "Utiliser ma position actuelle"}
                </>
              )}
            </Button>
          </div>

          {/* Carte Leaflet */}
          <div className="relative w-full h-[400px] rounded-lg overflow-hidden border">
            <MapComponent
              center={mapCenter}
              zoom={DEFAULT_ZOOM}
              onMarkerDragEnd={handleMarkerDragEnd}
              markerPosition={markerPosition}
              onMapClick={handleMapClick}
            />
          </div>

          {/* Affichage de l'adresse */}
          <div className="p-4 bg-muted rounded-lg">
            {geocoding ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {language === "ar"
                    ? "جاري البحث عن العنوان..."
                    : language === "en"
                    ? "Searching for address..."
                    : "Recherche de l'adresse..."}
                </span>
              </div>
            ) : address ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{address.fullAddress}</p>
                    {address.displayName !== address.fullAddress && (
                      <p className="text-xs text-muted-foreground mt-1">{address.displayName}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {language === "ar"
                  ? "لا يمكن العثور على عنوان لهذا الموقع"
                  : language === "en"
                  ? "Unable to find an address for this location"
                  : "Impossible de trouver une adresse pour cet emplacement"}
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === "ar" ? "إلغاء" : language === "en" ? "Cancel" : "Annuler"}
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!address || geocoding}>
              {language === "ar"
                ? "استخدام هذا الموقع"
                : language === "en"
                ? "Use this location"
                : "Utiliser cet emplacement"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
