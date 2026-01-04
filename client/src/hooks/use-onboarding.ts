import { useState, useCallback, useEffect } from "react";
import { customerLogin } from "@/lib/api";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { getOnboarding, saveOnboarding } from "@/pages/onboarding";
import type { OnboardingData } from "@/pages/onboarding";

const MAX_OTP_ATTEMPTS = 3;
const OTP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface UseOnboardingState {
  name: string;
  phone: string;
  otp: string;
  address: string;
  addressDetails: string;
  coords: { lat: number; lng: number } | null;
  otpAttempts: number;
  otpSentAt: number | null;
}

const initialState: UseOnboardingState = {
  name: "",
  phone: "",
  otp: "",
  address: "",
  addressDetails: "",
  coords: null,
  otpAttempts: 0,
  otpSentAt: null,
};

export function useOnboarding() {
  const { language } = useLanguage();
  const [state, setState] = useState<UseOnboardingState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = useCallback(
    (fr: string, en: string, ar: string) =>
      language === "ar" ? ar : language === "en" ? en : fr,
    [language],
  );

  // Charger les données existantes au montage
  useEffect(() => {
    const existing = getOnboarding();
    if (existing) {
      setState((prev) => ({
        ...prev,
        name: existing.name || "",
        phone: existing.phone || "",
        address: existing.address || "",
        addressDetails: existing.addressDetails || "",
        coords: existing.lat && existing.lng ? { lat: existing.lat, lng: existing.lng } : null,
      }));
    }
  }, []);

  // Validation du téléphone tunisien
  const validatePhone = useCallback((phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, "");
    // Format tunisien: 8 chiffres minimum, peut commencer par 2 ou 9
    return cleaned.length >= 8 && /^[29]\d{7,}$/.test(cleaned);
  }, []);

  // Validation du nom
  const validateName = useCallback((name: string): boolean => {
    return name.trim().length >= 2;
  }, []);

  // Vérifier si l'OTP a expiré
  const isOtpExpired = useCallback((): boolean => {
    if (!state.otpSentAt) return false;
    return Date.now() - state.otpSentAt > OTP_TIMEOUT_MS;
  }, [state.otpSentAt]);

  // Authentification simple (sans OTP) - MVP
  // OTP désactivé pour économiser sur les coûts SMS
  const sendOtpCode = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (!validateName(state.name)) {
      const msg = t(
        "Nom trop court (2 caractères minimum).",
        "Name is too short (min 2 characters).",
        "الاسم قصير جدًا (على الأقل حرفان).",
      );
      setError(msg);
      return false;
    }

    if (!validatePhone(state.phone)) {
      const msg = t(
        "Numéro invalide. Format attendu: +216 XX XXX XXX",
        "Invalid phone number. Expected format: +216 XX XXX XXX",
        "رقم غير صالح. التنسيق المتوقع: +216 XX XXX XXX",
      );
      setError(msg);
      return false;
    }

    try {
      setLoading(true);
      // Utiliser l'authentification simple (sans OTP)
      await customerLogin(state.name.trim(), state.phone.trim());
      toast.success(t("Authentification réussie", "Authentication successful", "تمت المصادقة بنجاح"));
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || t(
        "Échec de l'authentification. Réessaie.",
        "Authentication failed. Please try again.",
        "فشلت المصادقة، حاول مرة أخرى.",
      );
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [state.name, state.phone, validateName, validatePhone, t]);

  // Vérifier l'OTP - Désactivé (MVP sans OTP)
  // Cette fonction n'est plus utilisée mais conservée pour compatibilité
  const verifyOtpCode = useCallback(async (): Promise<boolean> => {
    // L'authentification se fait directement dans sendOtpCode
    // Cette fonction retourne toujours true pour permettre le passage à l'étape suivante
    return true;
  }, []);

  // Géocodage inverse : convertir lat/lng en nom de ville
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    try {
      // Utiliser l'API Nominatim d'OpenStreetMap (gratuite)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TataouinePizza/1.0', // Requis par Nominatim
          },
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      // Extraire le nom de la ville
      const city = data.address?.city || 
                   data.address?.town || 
                   data.address?.village || 
                   data.address?.municipality ||
                   data.address?.county ||
                   null;
      
      return city;
    } catch (error) {
      console.error('[Geocoding] Erreur:', error);
      return null;
    }
  }, []);

  // Obtenir la géolocalisation et convertir en nom de ville
  const getLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise(async (resolve) => {
      if (!("geolocation" in navigator)) {
        const msg = t(
          "La géolocalisation n'est pas supportée par ce navigateur.",
          "Geolocation is not supported by your browser.",
          "المتصفح لا يدعم تحديد الموقع الجغرافي.",
        );
        setError(msg);
        resolve(null);
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setState((prev) => ({ ...prev, coords }));
          
          // Convertir les coordonnées en nom de ville
          const cityName = await reverseGeocode(coords.lat, coords.lng);
          if (cityName) {
            // Mettre à jour l'adresse avec le nom de la ville
            setState((prev) => ({
              ...prev,
              address: cityName,
            }));
            toast.success(
              t(
                `Position enregistrée: ${cityName}`,
                `Location saved: ${cityName}`,
                `تم حفظ الموقع: ${cityName}`
              )
            );
          } else {
            toast.success(t("Position enregistrée", "Location saved", "تم حفظ الموقع"));
          }
          
          setLoading(false);
          resolve(coords);
        },
        () => {
          const msg = t(
            "Impossible de récupérer votre position.",
            "Unable to retrieve your location.",
            "تعذر الحصول على موقعك.",
          );
          setError(msg);
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
        },
      );
    });
  }, [t, reverseGeocode]);

  // Sauvegarder les données
  const save = useCallback(() => {
    const data: OnboardingData = {
      name: state.name.trim(),
      phone: state.phone.trim(),
      address: state.address.trim() || undefined,
      addressDetails: state.addressDetails.trim() || undefined,
      lat: state.coords?.lat,
      lng: state.coords?.lng,
    };
    saveOnboarding(data);
    console.log('[Onboarding] 💾 Données sauvegardées:', { 
      name: data.name, 
      phone: data.phone, 
      hasAddress: !!data.address,
      hasCoords: !!(data.lat && data.lng)
    });
    
    // Afficher un message de succès
    toast.success(
      t(
        "✅ Modification réussie ! Redirection vers l'accueil...",
        "✅ Update successful! Redirecting to home...",
        "✅ تم التعديل بنجاح! جاري التوجيه إلى الصفحة الرئيسية..."
      )
    );
  }, [state, t]);

  // Mettre à jour un champ
  const updateField = useCallback(<K extends keyof UseOnboardingState>(
    field: K,
    value: UseOnboardingState[K]
  ) => {
    setState((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  return {
    state,
    loading,
    error,
    setError,
    validatePhone,
    validateName,
    sendOtpCode,
    verifyOtpCode,
    getLocation,
    save,
    updateField,
  };
}

