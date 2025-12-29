import { useEffect } from "react";

export default function DriverAutoLogin() {
  useEffect(() => {
    console.log("========================================");
    console.log("[Auto-Login] 🔍 DÉBUT AUTO-LOGIN");
    console.log("[Auto-Login] URL complète:", window.location.href);
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const driverId = urlParams.get('driverId');
    const driverName = urlParams.get('driverName');
    const driverPhone = urlParams.get('driverPhone');
    const order = urlParams.get('order');
    const accepted = urlParams.get('accepted');

    console.log("[Auto-Login] 📋 Paramètres reçus:");
    console.log("  - token:", token ? `${token.substring(0, 20)}...` : "MANQUANT");
    console.log("  - driverId:", driverId || "MANQUANT");
    console.log("  - driverName:", driverName || "MANQUANT");
    console.log("  - driverPhone:", driverPhone || "MANQUANT");
    console.log("  - order:", order || "MANQUANT");
    console.log("  - accepted:", accepted || "MANQUANT");

    // Vérifier le token actuel dans localStorage
    const existingToken = localStorage.getItem("driverToken");
    console.log("[Auto-Login] 🔍 Token existant dans localStorage:", existingToken ? `${existingToken.substring(0, 20)}...` : "AUCUN");

    if (token && driverId && driverName) {
      console.log("[Auto-Login] ✅ Tous les paramètres requis sont présents");
      
      // Stocker les infos dans localStorage pour la session
      console.log("[Auto-Login] 💾 Stockage dans localStorage...");
      localStorage.setItem("driverToken", token);
      localStorage.setItem("driverId", driverId);
      localStorage.setItem("driverName", decodeURIComponent(driverName));
      if (driverPhone) {
        localStorage.setItem("driverPhone", decodeURIComponent(driverPhone));
      }
      
      // Vérifier que le stockage a bien fonctionné
      const storedToken = localStorage.getItem("driverToken");
      const storedDriverId = localStorage.getItem("driverId");
      const storedDriverName = localStorage.getItem("driverName");
      
      console.log("[Auto-Login] ✅ Vérification après stockage:");
      console.log("  - driverToken stocké:", storedToken ? `${storedToken.substring(0, 20)}...` : "❌ ÉCHEC");
      console.log("  - driverId stocké:", storedDriverId || "❌ ÉCHEC");
      console.log("  - driverName stocké:", storedDriverName || "❌ ÉCHEC");
      
      if (!storedToken || !storedDriverId) {
        console.error("[Auto-Login] ❌ ERREUR: Le stockage dans localStorage a échoué !");
        alert("Erreur de connexion. Veuillez réessayer.");
        window.location.href = '/driver/login';
        return;
      }
      
      console.log("[Auto-Login] ✅ Token stocké avec succès, redirection vers dashboard");
      
      // IMPORTANT: Utiliser window.location.href au lieu de setLocation
      // pour forcer un rechargement complet de la page et s'assurer
      // que le token est bien lu par le dashboard
      const dashboardUrl = order && accepted === 'true'
        ? `/driver/dashboard?order=${order}&accepted=true`
        : '/driver/dashboard';
      
      console.log("[Auto-Login] 🔄 Redirection vers:", dashboardUrl);
      
      // Petit délai pour s'assurer que localStorage est bien écrit
      setTimeout(() => {
        console.log("[Auto-Login] 🚀 Exécution de la redirection maintenant");
        window.location.href = dashboardUrl;
      }, 100);
    } else {
      // Si paramètres manquants, rediriger vers login
      console.error("[Auto-Login] ❌ Paramètres manquants:");
      console.error("  - token:", !token ? "MANQUANT" : "OK");
      console.error("  - driverId:", !driverId ? "MANQUANT" : "OK");
      console.error("  - driverName:", !driverName ? "MANQUANT" : "OK");
      console.log("[Auto-Login] 🔄 Redirection vers login");
      window.location.href = '/driver/login';
    }
    
    console.log("[Auto-Login] 🔍 FIN AUTO-LOGIN");
    console.log("========================================");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-700">Connexion en cours...</p>
      </div>
    </div>
  );
}

