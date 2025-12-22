import { useState } from "react";
import { useLocation } from "wouter";
import { Phone, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendOtp, verifyOtp } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

type Step = "phone" | "otp" | "location";

const STORAGE_KEY = "tp_onboarding";

interface OnboardingData {
  name: string;
  phone: string;
  address?: string;
  lat?: number;
  lng?: number;
}

function saveOnboarding(data: OnboardingData) {
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = (fr: string, en: string, ar: string) =>
    language === "ar" ? ar : language === "en" ? en : fr;

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError(
        t(
          "Nom trop court (2 caractères minimum).",
          "Name is too short (min 2 characters).",
          "الاسم قصير جدًا (على الأقل حرفان).",
        ),
      );
      return;
    }

    if (phone.trim().length < 8) {
      setError(t("Numéro invalide", "Invalid phone number", "رقم غير صالح"));
      return;
    }

    try {
      setLoading(true);
      await sendOtp(phone);
      setStep("otp");
    } catch (err: any) {
      console.error("[Onboarding] Erreur envoi OTP:", err);
      const errorMessage = err?.message || t(
        "Échec de l'envoi du code. Réessaie.",
        "Failed to send code. Please try again.",
        "فشل إرسال الرمز، حاول مرة أخرى.",
      );
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (otp.length !== 4) {
      setError(t("Code à 4 chiffres requis", "4‑digit code required", "رمز من 4 أرقام مطلوب"));
      return;
    }

    try {
      setLoading(true);
      const res = await verifyOtp(phone, otp);
      if (!res.verified) {
        setError(t("Code incorrect", "Invalid code", "رمز غير صحيح"));
        return;
      }
      setStep("location");
    } catch {
      setError(
        t(
          "Échec de la vérification. Réessaie.",
          "Verification failed. Please try again.",
          "فشل التحقق، حاول مرة أخرى.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleUseLocation() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError(
        t(
          "La géolocalisation n'est pas supportée par ce navigateur.",
          "Geolocation is not supported by your browser.",
          "المتصفح لا يدعم تحديد الموقع الجغرافي.",
        ),
      );
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setLoading(false);
      },
      () => {
        setError(
          t(
            "Impossible de récupérer votre position.",
            "Unable to retrieve your location.",
            "تعذر الحصول على موقعك.",
          ),
        );
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  function handleFinish() {
    saveOnboarding({
      name,
      phone,
      address,
      lat: coords?.lat,
      lng: coords?.lng,
    });
    // Navigate to menu (different route) to force Wouter to re-evaluate routing
    navigate("/menu");
  }

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
          {step === "phone" && (
            <form
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
                    "On l’utilise pour suivre tes commandes",
                    "We use it to track your orders",
                    "نستخدمه لتتبع طلباتك",
                  )}
                </p>
              </div>
              <div className="space-y-3">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t(
                    "Ton prénom et nom",
                    "Your first and last name",
                    "اسمك الكامل",
                  )}
                  className="h-12 text-lg"
                />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  className="h-12 text-center text-lg"
                />
              </div>
              {error && step === "phone" && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading || !phone.trim()}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("Recevoir un code", "Send code", "إرسال الرمز")
                )}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form
              onSubmit={handleVerifyOtp}
              className="bg-white rounded-3xl p-6 shadow-md border border-orange-100 space-y-4"
            >
              <div className="text-center mb-2">
                <h2 className="text-lg font-semibold">
                  {t(
                    "Entre le code reçu par SMS",
                    "Enter the SMS code",
                    "أدخل الرمز المرسل في الرسالة",
                  )}
                </h2>
              </div>
              <Input
                type="tel"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-center text-2xl tracking-[0.4em]"
              />
              {error && step === "otp" && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={loading || otp.length !== 4}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("Confirmer", "Confirm", "تأكيد")
                )}
              </Button>
            </form>
          )}

          {step === "location" && (
            <div className="bg-white rounded-3xl p-6 shadow-md border border-orange-100 space-y-4">
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
                      "Utiliser ma position",
                      "Use my location",
                      "استخدام موقعي",
                    )}
                  </>
                )}
              </Button>
              {coords && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 text-center">
                    {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
                  </p>
                  <div className="space-y-1">
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t(
                        "Ex : en face du café, près de la poste… (facultatif)",
                        "e.g. in front of the cafe, near the post office… (optional)",
                        "مثال: أمام المقهى، قرب البريد… (اختياري)",
                      )}
                      className="h-12"
                    />
                    <p className="text-xs text-gray-500">
                      {t(
                        "Aide le livreur à te trouver plus facilement (étage, repère, café, mosquée…).",
                        "Help the driver find you more easily (floor, landmark, cafe, mosque…).",
                        "ساعد عامل التوصيل في العثور عليك بسهولة (الطابق، معلم قريب، مقهى، مسجد...).",
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleFinish}
                    className="w-full h-12 text-base"
                  >
                    {t("Voir le menu", "See the menu", "عرض القائمة")}
                  </Button>
                </div>
              )}
              {error && step === "location" && !coords && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
            </div>
          )}

          <div className="flex justify-center gap-2 mt-2">
            {(["phone", "otp", "location"] as Step[]).map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full ${
                  step === s ? "bg-orange-600" : "bg-orange-200"
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}


