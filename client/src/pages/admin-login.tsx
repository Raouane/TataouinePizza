import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { adminLogin, adminRegister } from "@/lib/api";
import { Lock, AlertCircle, Shield } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Désactiver l'enregistrement en production
  // Désactiver l'enregistrement en production
  const isProduction = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
  const [isRegistering, setIsRegistering] = useState(false);

  // Log de diagnostic + CORRECTION: Rediriger vers / si pas de token (cache/service worker)
  useEffect(() => {
    const browserPath = window.location.pathname;
    const adminToken = localStorage.getItem("adminToken");
    
    console.log('[DEBUG] 🔐 COMPOSANT ADMIN LOGIN MONTÉ');
    console.log('  - URL navigateur:', browserPath);
    console.log('  - Admin token présent:', !!adminToken);
    
    // CORRECTION: Si on arrive sur /admin/login sans token, rediriger vers /
    // Cela corrige le problème où le cache/service worker garde l'ancienne URL
    if (!adminToken && browserPath === "/admin/login") {
      console.warn('[DEBUG] ⚠️ CORRECTION: AdminLogin monté sans token, redirection vers /');
      setLocation("/");
      return; // Ne pas continuer si on redirige
    }
    
    if (browserPath === "/") {
      console.warn('[DEBUG] ⚠️ PROBLÈME: AdminLogin monté alors que URL navigateur est /');
    }
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        const result = await adminRegister(email, password);
        localStorage.setItem("adminToken", result.token);
        setLocation("/admin/dashboard");
      } else {
        const result = await adminLogin(email, password);
        localStorage.setItem("adminToken", result.token);
        setLocation("/admin/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur s'est produite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <div className="bg-primary text-primary-foreground p-2 rounded-md mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-serif font-bold">Tataouine<span className="text-orange-600">Pizza</span></h1>
          </a>
          <p className="text-muted-foreground text-sm mt-2">Panel d'administration</p>
        </div>

        <Card className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">{isRegistering ? "Créer un compte admin" : "Se connecter"}</h2>
            <p className="text-sm text-muted-foreground">
              {isRegistering ? "Enregistrez-vous pour accéder au dashboard" : "Connectez-vous à votre compte admin"}
            </p>
          </div>

          {error && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pizzatataouine.tn"
                disabled={loading}
                required
                data-testid="input-admin-email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mot de passe</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                required
                minLength={6}
                data-testid="input-admin-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              data-testid="button-admin-submit"
            >
              {loading ? "Chargement..." : isRegistering ? "Créer un compte" : "Se connecter"}
            </Button>
          </form>

          {!isProduction && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError("");
                }}
                className="text-sm text-primary hover:underline"
                data-testid="button-toggle-register"
              >
                {isRegistering ? "Déjà inscrit ? Se connecter" : "Créer un compte admin"}
              </button>
            </div>
          )}
          {isProduction && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                En production, utilisez le script <code className="bg-gray-100 px-1 rounded">npm run create-admin</code> pour créer un admin
              </p>
            </div>
          )}
        </Card>

        <div className="text-center">
          <a href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Retour au site client
          </a>
        </div>
      </div>
    </div>
  );
}
