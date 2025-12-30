import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Bike, AlertCircle, ArrowLeft, Phone, KeyRound } from "lucide-react";

export default function DriverLogin() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/driver/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Téléphone ou mot de passe incorrect");
      }
      
      const { token, driver } = await res.json();
      localStorage.setItem("driverToken", token);
      localStorage.setItem("driverId", driver.id);
      localStorage.setItem("driverName", driver.name);
      localStorage.setItem("driverPhone", phone);
      setLocation("/driver/dashboard");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la connexion");
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
              <Bike className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-serif font-bold">Espace Livreur</h1>
          </a>
          <p className="text-muted-foreground text-sm mt-2">Connectez-vous pour gérer vos livraisons</p>
        </div>

        <Card className="p-8 space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Connexion</h2>
            <p className="text-sm text-muted-foreground">
              Entrez votre téléphone et votre mot de passe
            </p>
          </div>

          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="21612345678"
                  disabled={loading}
                  required
                  minLength={8}
                  className="pl-10"
                  data-testid="input-driver-phone"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Format: 216XXXXXXXX (sans espaces)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mot de passe</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                  minLength={4}
                  className="pl-10"
                  data-testid="input-driver-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || phone.length < 8 || password.length < 4}
              className="w-full"
              data-testid="button-driver-login"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
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
