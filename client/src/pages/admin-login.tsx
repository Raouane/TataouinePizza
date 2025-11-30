import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { adminLogin, adminRegister } from "@/lib/api";
import { Lock, AlertCircle } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

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
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex justify-center">
          <div className="bg-primary text-primary-foreground p-3 rounded-lg">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-serif font-bold mb-2">Admin Tataouine Pizza</h1>
          <p className="text-muted-foreground">
            {isRegistering ? "Créer un compte" : "Se connecter"}
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
            <label className="block text-sm font-medium mb-1">Email</label>
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
            <label className="block text-sm font-medium mb-1">Mot de passe</label>
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
      </Card>
    </div>
  );
}
