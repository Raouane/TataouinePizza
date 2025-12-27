import { useState, useCallback, useEffect } from "react";
import { sendOtp, verifyOtp } from "@/lib/api";
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

  // Envoyer l'OTP
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
      await sendOtp(state.phone);
      setState((prev) => ({
        ...prev,
        otpAttempts: 0,
        otpSentAt: Date.now(),
      }));
      toast.success(t("Code envoyé par SMS", "Code sent by SMS", "تم إرسال الرمز عبر الرسالة القصيرة"));
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || t(
        "Échec de l'envoi du code. Réessaie.",
        "Failed to send code. Please try again.",
        "فشل إرسال الرمز، حاول مرة أخرى.",
      );
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [state.name, state.phone, validateName, validatePhone, t]);

  // Vérifier l'OTP
  const verifyOtpCode = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (state.otp.length !== 4) {
      const msg = t(
        "Code à 4 chiffres requis",
        "4-digit code required",
        "رمز من 4 أرقام مطلوب",
      );
      setError(msg);
      return false;
    }

    if (isOtpExpired()) {
      const msg = t(
        "Le code a expiré. Demande un nouveau code.",
        "Code expired. Request a new code.",
        "انتهت صلاحية الرمز. اطلب رمزًا جديدًا.",
      );
      setError(msg);
      setState((prev) => ({ ...prev, otp: "", otpSentAt: null }));
      return false;
    }

    if (state.otpAttempts >= MAX_OTP_ATTEMPTS) {
      const msg = t(
        "Trop de tentatives. Réessaie dans quelques minutes.",
        "Too many attempts. Try again in a few minutes.",
        "محاولات كثيرة جدًا. حاول مرة أخرى بعد بضع دقائق.",
      );
      setError(msg);
      return false;
    }

    try {
      setLoading(true);
      const res = await verifyOtp(state.phone, state.otp);
      if (!res.verified) {
        setState((prev) => ({
          ...prev,
          otpAttempts: prev.otpAttempts + 1,
          otp: "",
        }));
        const msg = t("Code incorrect", "Invalid code", "رمز غير صحيح");
        setError(msg);
        toast.error(msg);
        return false;
      }
      toast.success(t("Code vérifié avec succès", "Code verified successfully", "تم التحقق من الرمز بنجاح"));
      return true;
    } catch (err: any) {
      const errorMessage = err?.message || t(
        "Échec de la vérification. Réessaie.",
        "Verification failed. Please try again.",
        "فشل التحقق، حاول مرة أخرى.",
      );
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [state.otp, state.phone, state.otpAttempts, isOtpExpired, t]);

  // Obtenir la géolocalisation
  const getLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
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
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setState((prev) => ({ ...prev, coords }));
          setLoading(false);
          toast.success(t("Position enregistrée", "Location saved", "تم حفظ الموقع"));
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
  }, [t]);

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
  }, [state]);

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

