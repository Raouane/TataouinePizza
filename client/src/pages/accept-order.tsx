import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

/**
 * Page pour accepter une commande via lien Telegram
 * Cette page est appelée quand le livreur clique sur le bouton dans Telegram
 * Elle appelle l'API backend pour accepter la commande, puis redirige vers le dashboard
 */
export default function AcceptOrder() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/accept/:orderId");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!match || !params) {
      setStatus("error");
      setErrorMessage("URL invalide");
      return;
    }

    const orderId = params.orderId;
    const urlParams = new URLSearchParams(window.location.search);
    const driverId = urlParams.get("driverId");

    console.log("[AcceptOrder] 🔍 Paramètres:", { orderId, driverId });

    if (!orderId || !driverId) {
      setStatus("error");
      setErrorMessage("Paramètres manquants (orderId ou driverId)");
      toast.error("Lien invalide - Paramètres manquants");
      return;
    }

    // Appeler l'API backend pour accepter la commande
    const acceptOrder = async () => {
      try {
        console.log("========================================");
        console.log("[AcceptOrder] 📡 Appel API pour accepter la commande");
        console.log("[AcceptOrder] 📋 orderId:", orderId);
        console.log("[AcceptOrder] 📋 driverId:", driverId);
        console.log("[AcceptOrder] 📋 URL:", `/api/orders/${orderId}/accept`);
        console.log("========================================");
        
        let response: Response;
        try {
          response = await fetch(`/api/orders/${orderId}/accept`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ driverId }),
          });
        } catch (networkError: any) {
          console.error("[AcceptOrder] ❌ Erreur réseau:", networkError);
          throw new Error(`Erreur de connexion au serveur: ${networkError.message || "Impossible de contacter le serveur"}`);
        }

        console.log("[AcceptOrder] 📥 Réponse reçue:");
        console.log("[AcceptOrder] 📥 Status:", response.status);
        console.log("[AcceptOrder] 📥 StatusText:", response.statusText);
        console.log("[AcceptOrder] 📥 Headers:", Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          let errorData: any;
          try {
            errorData = await response.json();
          } catch (parseError) {
            // Si la réponse n'est pas du JSON, utiliser le texte
            const text = await response.text().catch(() => "Erreur inconnue");
            errorData = { error: text || `Erreur ${response.status}` };
          }
          console.error("[AcceptOrder] ❌ Erreur API:", errorData);
          throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("[AcceptOrder] ✅ Commande acceptée avec succès:", data);

        setStatus("success");
        toast.success("Commande acceptée avec succès !");

        // Vérifier si le livreur a un token (est connecté)
        const driverToken = localStorage.getItem("driverToken");
        const driverIdFromStorage = localStorage.getItem("driverId");
        
        console.log("[AcceptOrder] 🔍 Vérification authentification:");
        console.log("[AcceptOrder] 📋 Token présent:", !!driverToken);
        console.log("[AcceptOrder] 📋 driverId dans storage:", driverIdFromStorage);
        console.log("[AcceptOrder] 📋 driverId de la requête:", driverId);

        // Si le livreur n'est pas connecté, rediriger vers la page de login
        // avec un message indiquant que la commande a été acceptée
        if (!driverToken || driverIdFromStorage !== driverId) {
          console.log("[AcceptOrder] ⚠️ Livreur non connecté, redirection vers login");
          setTimeout(() => {
            setLocation(`/driver/login?order=${orderId}&accepted=true&driverId=${driverId}`);
          }, 1500);
        } else {
          // Si connecté, rediriger vers le dashboard
          console.log("[AcceptOrder] ✅ Livreur connecté, redirection vers dashboard");
          setTimeout(() => {
            setLocation(`/driver/dashboard?order=${orderId}&accepted=true`);
          }, 1000);
        }
      } catch (error: any) {
        console.error("[AcceptOrder] ❌ Erreur:", error);
        setStatus("error");
        setErrorMessage(error.message || "Erreur lors de l'acceptation de la commande");
        toast.error(error.message || "Erreur lors de l'acceptation de la commande");
        
        // Rediriger vers le dashboard après 3 secondes même en cas d'erreur
        setTimeout(() => {
          setLocation("/driver/dashboard");
        }, 3000);
      }
    };

    acceptOrder();
  }, [match, params, setLocation]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">⏳ Acceptation de la commande en cours...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-lg font-medium text-green-600">Commande acceptée avec succès !</p>
          <p className="text-sm text-muted-foreground mt-2">Redirection vers le dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-bold mb-2">Erreur</h1>
        <p className="text-muted-foreground mb-4">{errorMessage}</p>
        <button
          onClick={() => setLocation("/driver/dashboard")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Aller au dashboard
        </button>
      </div>
    </div>
  );
}
