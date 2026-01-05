import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ChefHat, AlertCircle, ArrowLeft, Phone, KeyRound } from "lucide-react";

export default function RestaurantLogin() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("==========================================");
    console.log("[CLIENT RESTAURANT LOGIN] 🔵 Clic sur Se connecter");
    console.log("[CLIENT RESTAURANT LOGIN] 📥 Données du formulaire:", {
      phone,
      phoneLength: phone.length,
      password: password ? "***" : "MANQUANT",
      passwordLength: password.length,
      loading,
      buttonDisabled: loading || phone.length < 8 || password.length < 6
    });
    
    setError("");
    setLoading(true);

    try {
      const requestBody = { phone, password };
      console.log("[CLIENT RESTAURANT LOGIN] 📤 Envoi de la requête à /api/restaurant/login");
      console.log("[CLIENT RESTAURANT LOGIN] 📋 Body:", {
        phone: requestBody.phone,
        password: requestBody.password ? "***" : "MANQUANT"
      });
      
      const res = await fetch("/api/restaurant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      console.log("[CLIENT RESTAURANT LOGIN] 📥 Réponse reçue:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok
      });
      
      if (!res.ok) {
        const err = await res.json();
        console.log("[CLIENT RESTAURANT LOGIN] ❌ Erreur de la réponse:", err);
        throw new Error(err.error || "Téléphone ou mot de passe incorrect");
      }
      
      const data = await res.json();
      console.log("[CLIENT RESTAURANT LOGIN] ✅ Connexion réussie:", {
        hasToken: !!data.token,
        restaurant: data.restaurant
      });
      
      const { token, restaurant } = data;
      localStorage.setItem("restaurantToken", token);
      localStorage.setItem("restaurantId", restaurant.id);
      localStorage.setItem("restaurantName", restaurant.name);
      localStorage.setItem("restaurantPhone", phone);
      console.log("[CLIENT RESTAURANT LOGIN] 💾 Données sauvegardées dans localStorage");
      console.log("[CLIENT RESTAURANT LOGIN] 🔄 Redirection vers /restaurant/dashboard");
      setLocation("/restaurant/dashboard");
    } catch (err: any) {
      console.log("[CLIENT RESTAURANT LOGIN] ❌ ERREUR:", err);
      console.log("[CLIENT RESTAURANT LOGIN] 📝 Message d'erreur:", err.message);
      setError(err.message || "Erreur lors de la connexion");
    } finally {
      setLoading(false);
      console.log("[CLIENT RESTAURANT LOGIN] ✅ Fin du traitement (loading = false)");
      console.log("==========================================");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <div className="bg-orange-600 text-white p-3 rounded-full mb-4 inline-block">
              <ChefHat className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-serif font-bold">Espace Restaurant</h1>
          </a>
          <p className="text-muted-foreground text-sm mt-2">Gérez vos commandes en temps réel</p>
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

          <form 
            onSubmit={(e) => {
              console.log("[CLIENT RESTAURANT LOGIN] 📝 Formulaire soumis");
              handleLogin(e);
            }} 
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-2">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="21611111111"
                  disabled={loading}
                  required
                  minLength={8}
                  className="pl-10"
                  data-testid="input-restaurant-phone"
                />
              </div>
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
                  minLength={6}
                  className="pl-10"
                  data-testid="input-restaurant-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || phone.length < 8 || password.length < 6}
              className="w-full bg-orange-600 hover:bg-orange-700"
              data-testid="button-restaurant-login"
              onClick={() => {
                console.log("[CLIENT RESTAURANT LOGIN] 🖱️ Clic sur le bouton détecté");
                console.log("[CLIENT RESTAURANT LOGIN] 📊 État du bouton:", {
                  loading,
                  phoneLength: phone.length,
                  passwordLength: password.length,
                  disabled: loading || phone.length < 8 || password.length < 6
                });
              }}
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
