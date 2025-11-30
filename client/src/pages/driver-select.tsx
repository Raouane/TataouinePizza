import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Truck } from "lucide-react";

interface DriverOption {
  id: string;
  name: string;
  phone: string;
  password: string;
}

const DRIVERS: DriverOption[] = [
  { id: "driver-1", name: "Mohamed", phone: "21612345678", password: "driver123" },
  { id: "driver-2", name: "Ahmed", phone: "21698765432", password: "driver123" },
  { id: "driver-3", name: "Fatima", phone: "21625874123", password: "driver123" },
];

export default function DriverSelect() {
  const [, setLocation] = useLocation();

  const handleDriverSelect = async (driver: DriverOption) => {
    try {
      const response = await fetch("/api/driver/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: driver.phone, password: driver.password }),
      });

      if (!response.ok) throw new Error("Login failed");

      const { token } = await response.json();
      localStorage.setItem("driverToken", token);
      localStorage.setItem("driverId", driver.id);
      localStorage.setItem("driverName", driver.name);

      setLocation("/driver/dashboard");
    } catch (error: any) {
      alert(`Erreur: ${error.message}`);
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

      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Truck className="w-8 h-8 text-primary" />
            <h1 className="font-serif text-3xl font-bold">Espace Livreur</h1>
          </div>
          <p className="text-muted-foreground">Sélectionne un livreur pour accéder au dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DRIVERS.map((driver) => (
            <Card 
              key={driver.id} 
              className="cursor-pointer hover:shadow-lg hover:border-primary transition-all"
              onClick={() => handleDriverSelect(driver)}
              data-testid={`card-driver-${driver.id}`}
            >
              <CardHeader>
                <CardTitle className="text-lg">{driver.name}</CardTitle>
                <CardDescription className="text-xs">{driver.phone}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge className="w-full justify-center">
                  Connecter
                </Badge>
                <p className="text-xs text-center text-muted-foreground">
                  Accéder au tableau de bord
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground p-4 bg-muted rounded">
          <p className="font-medium">Accès de démonstration</p>
          <p>Tous les livreurs utilisent le mot de passe: <span className="font-mono font-bold">driver123</span></p>
        </div>
      </div>
    </div>
  );
}
