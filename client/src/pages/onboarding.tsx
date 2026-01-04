import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Phone, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";
import { useOnboarding } from "@/hooks/use-onboarding";
import { StepError } from "@/components/onboarding/step-error";
import { StepProgress } from "@/components/onboarding/step-progress";
import { motion, AnimatePresence } from "framer-motion";

type Step = "phone" | "location";

const STORAGE_KEY = "tp_onboarding";

export interface OnboardingData {
  name: string;
  phone: string;
  address?: string;
  addressDetails?: string;
  lat?: number;
  lng?: number;
}

export function saveOnboarding(data: OnboardingData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

export function getOnboarding(): OnboardingData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingData;
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const { language } = useLanguage();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [showManualAddress, setShowManualAddress] = useState(false);

  const {
    state,
    loading,
    error,
    setError,
    sendOtpCode,
    getLocation,
    save,
    updateField,
  } = useOnboarding();

  const t = useCallback(
    (fr: string, en: string, ar: string) =>
      language === "ar" ? ar : language === "en" ? en : fr,
    [language],
  );

  // Authentification simple (sans OTP) - Passe directement à la localisation
  const handleSendOtp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const success = await sendOtpCode();
      if (success) {
        // Passer directement à l'étape de localisation (sauter l'étape OTP)
        // Ne pas sauvegarder ici pour éviter que le router redirige vers la home
        setStep("location");
      }
    },
    [sendOtpCode],
  );


  const handleUseLocation = useCallback(async () => {
    setError(null);
    const coords = await getLocation();
    if (!coords && !showManualAddress) {
      setShowManualAddress(true);
    }
  }, [getLocation, showManualAddress, setError]);

  const handleFinish = useCallback(() => {
    // Sauvegarder les données
    save();
    
    // Afficher un message de succès
    console.log('[Onboarding] ✅ Profil sauvegardé, redirection vers la home...');
    
    // Utiliser window.location.href pour forcer la redirection
    // et éviter que le router ne détecte le changement avant
    setTimeout(() => {
      // Forcer la redirection vers la home
      window.location.href = "/";
    }, 1500);
  }, [save]);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, "");
      updateField("phone", value);
    },
    [updateField],
  );


  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex flex-col">
      <header className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-4">
          <span className="text-3xl">🍕</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">
          {t(
            "Bienvenue à Tataouine Pizza",
            "Welcome to Tataouine Pizza",
            "مرحبًا بك في تاطاوين بيتزا",
          )}
        </h1>
        <p className="text-gray-500 mt-2">
          {t(
            "On prépare ta livraison en 3 étapes",
            "3 quick steps before your first order",
            "3 خطوات قبل أول طلب لك",
          )}
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <AnimatePresence mode="wait">
            {step === "phone" && (
              <motion.form
                key="phone"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={stepVariants}
                onSubmit={handleSendOtp}
                className="bg-white rounded-3xl p-6 shadow-md border border-orange-100 space-y-4"
              >
                <div className="text-center mb-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 mb-3">
                    <Phone className="w-7 h-7 text-orange-600" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    {t(
                      "Ton numéro de téléphone",
                      "Your phone number",
                      "رقم هاتفك",
                    )}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t(
                      "On l'utilise pour suivre tes commandes",
                      "We use it to track your orders",
                      "نستخدمه لتتبع طلباتك",
                    )}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-name" className="sr-only">
                      {t("Ton prénom et nom", "Your first and last name", "اسمك الكامل")}
                    </Label>
                    <Input
                      id="onboarding-name"
                      type="text"
                      value={state.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder={t(
                        "Ton prénom et nom",
                        "Your first and last name",
                        "اسمك الكامل",
                      )}
                      className="h-12 text-lg"
                      aria-label={t(
                        "Ton prénom et nom",
                        "Your first and last name",
                        "اسمك الكامل",
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-phone" className="sr-only">
                      {t("Numéro de téléphone", "Phone number", "رقم الهاتف")}
                    </Label>
                    <Input
                      id="onboarding-phone"
                      type="tel"
                      value={state.phone}
                      onChange={handlePhoneChange}
                      placeholder="+216 XX XXX XXX"
                      className="h-12 text-center text-lg"
                      aria-label={t("Numéro de téléphone", "Phone number", "رقم الهاتف")}
                      maxLength={15}
                    />
                  </div>
                </div>
                <StepError error={error} step="phone" currentStep={step} />
                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={loading || !state.phone.trim() || !state.name.trim()}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("Continuer", "Continue", "متابعة")
                  )}
                </Button>
              </motion.form>
            )}

            {step === "location" && (
              <motion.div
                key="location"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={stepVariants}
                className="bg-white rounded-3xl p-6 shadow-md border border-orange-100 space-y-4"
              >
                <div className="text-center mb-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 mb-3">
                    <MapPin className="w-7 h-7 text-orange-600" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    {t(
                      "Où doit-on livrer ?",
                      "Where should we deliver?",
                      "أين نوصّل طلبك؟",
                    )}
                  </h2>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="onboarding-address" className="sr-only">
                    {t("Adresse complète", "Full address", "العنوان الكامل")}
                  </Label>
                  <Input
                    id="onboarding-address"
                    value={state.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder={t(
                      "Adresse complète (optionnel - sera demandé lors de la commande)",
                      "Full address (optional - will be asked when ordering)",
                      "العنوان الكامل (اختياري - سيُطلب عند الطلب)",
                    )}
                    className="h-12"
                    aria-label={t("Adresse complète", "Full address", "العنوان الكامل")}
                  />
                  <p className="text-xs text-gray-500">
                    {t(
                      "Vous pourrez compléter l'adresse lors de votre première commande",
                      "You can complete the address when placing your first order",
                      "يمكنك إكمال العنوان عند تقديم طلبك الأول",
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="onboarding-address-details" className="sr-only">
                    {t("Détails d'adresse", "Address details", "تفاصيل العنوان")}
                  </Label>
                  <Input
                    id="onboarding-address-details"
                    value={state.addressDetails}
                    onChange={(e) => updateField("addressDetails", e.target.value)}
                    placeholder={t(
                      "Détails (étage, repère, café, mosquée...) - optionnel",
                      "Details (floor, landmark, cafe, mosque...) - optional",
                      "تفاصيل (الطابق، معلم، مقهى، مسجد...) - اختياري",
                    )}
                    className="h-12"
                    aria-label={t("Détails d'adresse", "Address details", "تفاصيل العنوان")}
                  />
                  <p className="text-xs text-gray-500">
                    {t(
                      "Aide le livreur à te trouver plus facilement",
                      "Help the driver find you more easily",
                      "ساعد عامل التوصيل في العثور عليك بسهولة",
                    )}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleUseLocation}
                  className="w-full h-12 text-base"
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      {t(
                        "Utiliser ma position (optionnel)",
                        "Use my location (optional)",
                        "استخدام موقعي (اختياري)",
                      )}
                    </>
                  )}
                </Button>

                {!state.coords && (showManualAddress || error) && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 text-center">
                      {t(
                        "Vous pouvez entrer votre adresse manuellement ci-dessus",
                        "You can enter your address manually above",
                        "يمكنك إدخال عنوانك يدويًا أعلاه",
                      )}
                    </p>
                  </div>
                )}

                {state.coords && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700 text-center">
                      {t(
                        "✓ Position enregistrée",
                        "✓ Location saved",
                        "✓ تم حفظ الموقع",
                      )}: {state.coords.lat.toFixed(6)}, {state.coords.lng.toFixed(6)}
                    </p>
                  </div>
                )}

                <StepError error={error} step="location" currentStep={step} />

                <Button
                  type="button"
                  onClick={handleFinish}
                  className="w-full h-12 text-base"
                >
                  {t("Continuer", "Continue", "متابعة")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <StepProgress currentStep={step} />
        </div>
      </main>
    </div>
  );
}
