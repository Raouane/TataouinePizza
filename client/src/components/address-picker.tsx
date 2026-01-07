import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Loader2, Navigation, Search, Store } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { reverseGeocodeFull, type ReverseGeocodeResult } from "@/hooks/use-onboarding";
import { geocodeAddressInTataouine } from "@/lib/geocoding-utils";
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
  restaurantCoords?: { lat: number; lng: number; name?: string } | null;
}

// Icône personnalisée pour le restaurant (pin rouge) - créée une seule fois
const restaurantIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapComponent = ({ center, zoom, onMarkerDragEnd, markerPosition, onMapClick, restaurantCoords }: MapComponentProps) => {
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
      {/* Marqueur pour le restaurant (pin rouge, non déplaçable) */}
      {restaurantCoords && (
        <Marker
          position={[restaurantCoords.lat, restaurantCoords.lng]}
          icon={restaurantIcon}
          title={restaurantCoords.name || "Restaurant"}
        />
      )}
      {/* Marqueur pour l'adresse de livraison (pin bleu, déplaçable) */}
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
  restaurantCoords,
  onAddressSelected,
}: AddressPickerProps) {
  const { t, language } = useLanguage();
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(DEFAULT_CENTER);
  const [address, setAddress] = useState<ReverseGeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");
  const [searchingAddress, setSearchingAddress] = useState(false);

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
      toast.error(t('geolocation.notSupported'));
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
            msg = t('geolocation.permissionDenied');
            break;
          case error.POSITION_UNAVAILABLE:
            msg = t('geolocation.positionUnavailable');
            break;
          case error.TIMEOUT:
            msg = t('geolocation.timeout');
            break;
          default:
            msg = t('geolocation.unknownError');
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

  // Géocoder une adresse saisie dans le champ de recherche
  const handleSearchAddress = useCallback(async () => {
    if (!searchAddress.trim()) {
      toast.error(
        language === "ar"
          ? "يرجى إدخال عنوان"
          : language === "en"
          ? "Please enter an address"
          : "Veuillez entrer une adresse"
      );
      return;
    }

    setSearchingAddress(true);
    try {
      const result = await geocodeAddressInTataouine(searchAddress.trim());
      if (result) {
        const coords: [number, number] = [result.lat, result.lng];
        setMapCenter(coords);
        setMarkerPosition(coords);
        // Faire le reverse geocoding pour obtenir l'adresse complète
        await handleGeocode(result.lat, result.lng);
        toast.success(
          language === "ar"
            ? "تم العثور على العنوان"
            : language === "en"
            ? "Address found"
            : "Adresse trouvée"
        );
      } else {
        toast.error(
          language === "ar"
            ? "لم يتم العثور على العنوان"
            : language === "en"
            ? "Address not found"
            : "Adresse non trouvée"
        );
      }
    } catch (error) {
      console.error("[AddressPicker] Erreur de géocodage:", error);
      toast.error(
        language === "ar"
          ? "خطأ في البحث عن العنوان"
          : language === "en"
          ? "Error searching for address"
          : "Erreur lors de la recherche de l'adresse"
      );
    } finally {
      setSearchingAddress(false);
    }
  }, [searchAddress, handleGeocode, language]);

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
          {/* Champ de recherche d'adresse */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder={
                  language === "ar"
                    ? "ابحث عن عنوان أو اكتبه..."
                    : language === "en"
                    ? "Search or type an address..."
                    : "Rechercher ou écrire une adresse..."
                }
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchAddress();
                  }
                }}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleSearchAddress}
                disabled={searchingAddress || !searchAddress.trim()}
                className="absolute right-0 top-0 h-full px-3"
              >
                {searchingAddress ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

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
              restaurantCoords={restaurantCoords}
            />
            {/* Légende */}
            {restaurantCoords && (
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md text-xs space-y-1 z-[1000]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>
                    {language === "ar"
                      ? restaurantCoords.name || "المطعم"
                      : language === "en"
                      ? restaurantCoords.name || "Restaurant"
                      : restaurantCoords.name || "Restaurant"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>
                    {language === "ar"
                      ? "عنوان التوصيل"
                      : language === "en"
                      ? "Delivery address"
                      : "Adresse de livraison"}
                  </span>
                </div>
              </div>
            )}
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
