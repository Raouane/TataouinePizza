import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { sendOtp } from "@/lib/api";
import { Truck, AlertCircle, ArrowLeft, Phone, KeyRound } from "lucide-react";

export default function DriverLogin() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sendOtp(phone);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Verify OTP and login in one call
      const res = await fetch("/api/driver/login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Livreur non trouvé");
      }
      
      const { token, driver } = await res.json();
      localStorage.setItem("driverToken", token);
      localStorage.setItem("driverId", driver.id);
      localStorage.setItem("driverName", driver.name);
      localStorage.setItem("driverPhone", phone);
      setLocation("/driver/dashboard");
    } catch (err: any) {
      setError(err.message || "Code incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <div className="bg-primary text-primary-foreground p-3 rounded-full mb-4 inline-block">
              <Truck className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-serif font-bold">Espace Livreur</h1>
          </a>
          <p className="text-muted-foreground text-sm mt-2">Connectez-vous pour gérer vos livraisons</p>
        </div>

        <Card className="p-8 space-y-6">
          {step === "phone" ? (
            <>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Numéro de téléphone</h2>
                <p className="text-sm text-muted-foreground">
                  Entrez votre numéro pour recevoir un code de vérification
                </p>
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Téléphone</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="21612345678"
                    disabled={loading}
                    required
                    minLength={8}
                    data-testid="input-driver-phone"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: 216XXXXXXXX (sans espaces)
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || phone.length < 8}
                  className="w-full"
                  data-testid="button-send-otp"
                >
                  {loading ? "Envoi en cours..." : "Recevoir le code"}
                </Button>
              </form>

              {/* Demo info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="font-medium text-blue-900 mb-2">🔑 Livreurs de démo:</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Mohamed: <code className="bg-blue-100 px-1 rounded">21612345678</code></li>
                  <li>• Ahmed: <code className="bg-blue-100 px-1 rounded">21698765432</code></li>
                  <li>• Fatima: <code className="bg-blue-100 px-1 rounded">21625874123</code></li>
                </ul>
                <p className="mt-2 text-blue-700">Code OTP de démo: <code className="bg-blue-100 px-1 rounded font-bold">1234</code></p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">Vérification</h2>
                <p className="text-sm text-muted-foreground">
                  Entrez le code envoyé au <span className="font-medium">{phone}</span>
                </p>
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Code OTP</label>
                  <Input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="1234"
                    disabled={loading}
                    required
                    maxLength={4}
                    className="text-center text-2xl tracking-widest"
                    data-testid="input-driver-otp"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || otpCode.length !== 4}
                  className="w-full"
                  data-testid="button-verify-otp"
                >
                  {loading ? "Vérification..." : "Vérifier et se connecter"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtpCode("");
                  setError("");
                }}
                className="w-full text-sm text-primary hover:underline"
              >
                ← Changer de numéro
              </button>
            </>
          )}
        </Card>

        <div className="text-center">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-4 h-4" />
            Retour au site
          </a>
        </div>
      </div>
    </div>
  );
}
