import { useEffect } from "react";

export default function DriverAutoLogin() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const driverId = urlParams.get('driverId');
    const driverName = urlParams.get('driverName');
    const driverPhone = urlParams.get('driverPhone');
    const order = urlParams.get('order');
    const accepted = urlParams.get('accepted');

    if (token && driverId && driverName) {
      // Stocker les infos dans localStorage pour la session
      localStorage.setItem("driverToken", token);
      localStorage.setItem("driverId", driverId);
      localStorage.setItem("driverName", decodeURIComponent(driverName));
      if (driverPhone) {
        localStorage.setItem("driverPhone", decodeURIComponent(driverPhone));
      }
      
      console.log("[Auto-Login] ✅ Token stocké, redirection vers dashboard");
      
      // IMPORTANT: Utiliser window.location.href au lieu de setLocation
      // pour forcer un rechargement complet de la page et s'assurer
      // que le token est bien lu par le dashboard
      const dashboardUrl = order && accepted === 'true'
        ? `/driver/dashboard?order=${order}&accepted=true`
        : '/driver/dashboard';
      
      // Petit délai pour s'assurer que localStorage est bien écrit
      setTimeout(() => {
        window.location.href = dashboardUrl;
      }, 100);
    } else {
      // Si paramètres manquants, rediriger vers login
      console.log("[Auto-Login] ⚠️ Paramètres manquants, redirection vers login");
      window.location.href = '/driver/login';
    }
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

