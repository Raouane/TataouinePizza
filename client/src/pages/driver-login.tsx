import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function DriverLogin() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/driver/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      if (!response.ok) throw new Error("Invalid credentials");

      const { token, driver } = await response.json();
      localStorage.setItem("driverToken", token);
      localStorage.setItem("driverId", driver.id);
      localStorage.setItem("driverName", driver.name);

      toast.success(`Bienvenue, ${driver.name}!`);
      setLocation("/driver/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 px-4">
      <div className="absolute top-4 left-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          className="gap-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl">Espace Livreur</CardTitle>
          <CardDescription>Connectez-vous pour voir vos commandes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input
                type="tel"
                placeholder="21612345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                data-testid="input-driver-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mot de passe</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-driver-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-driver-login">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>

            <div className="text-xs text-center text-muted-foreground mt-4 p-3 bg-muted rounded">
              <p className="font-medium">Démonstration :</p>
              <p>Tél: 21612345678</p>
              <p>Pwd: driver123</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
