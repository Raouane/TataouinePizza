import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, LogOut, Phone, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  status: string;
  totalPrice: string;
  estimatedDeliveryTime: number | null;
}

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [driverStatus, setDriverStatus] = useState("available");
  const [loading, setLoading] = useState(true);
  const driverName = localStorage.getItem("driverName") || "Livreur";

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("driverToken");
      const response = await fetch("/api/driver/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/driver/login");
          return;
        }
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data);
    } catch (error) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      const token = localStorage.getItem("driverToken");
      await fetch("/api/driver/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      setDriverStatus(status);
      toast.success(`Statut changé: ${status}`);
    } catch (error) {
      toast.error("Erreur de mise à jour");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("driverToken");
      await fetch(`/api/driver/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      toast.success("Commande mise à jour");
    } catch (error) {
      toast.error("Erreur de mise à jour");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverId");
    localStorage.removeItem("driverName");
    setLocation("/driver/login");
  };

  const statusColor = {
    available: "bg-green-100 text-green-800",
    on_delivery: "bg-blue-100 text-blue-800",
    offline: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-primary" />
            <div>
              <h1 className="font-serif font-bold text-lg">Tableau de bord</h1>
              <p className="text-sm text-muted-foreground">Bienvenue, {driverName}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-driver-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Status Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Votre Statut</CardTitle>
            <CardDescription>Informez-nous de votre disponibilité</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            {["available", "on_delivery", "offline"].map((status) => (
              <Button
                key={status}
                variant={driverStatus === status ? "default" : "outline"}
                onClick={() => handleStatusChange(status)}
                data-testid={`button-status-${status}`}
              >
                <Badge className={statusColor[status as keyof typeof statusColor]}>
                  {status === "available" && "Disponible"}
                  {status === "on_delivery" && "En livraison"}
                  {status === "offline" && "Hors ligne"}
                </Badge>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Orders */}
        <div>
          <h2 className="font-serif text-xl font-bold mb-4">
            Vos Commandes ({orders.length})
          </h2>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                Aucune commande assignée pour le moment
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <Card key={order.id} data-testid={`card-order-${order.id}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold">{order.customerName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Commande #{order.id.slice(0, 8)}
                          </p>
                        </div>
                        <Badge>{order.status}</Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${order.phone}`} className="text-primary hover:underline">
                            {order.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{order.address}</span>
                        </div>
                        {order.estimatedDeliveryTime && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{order.estimatedDeliveryTime} min</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t flex gap-2">
                        {order.status !== "delivered" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateOrderStatus(order.id, "delivery")}
                              data-testid={`button-status-delivery-${order.id}`}
                            >
                              En route
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateOrderStatus(order.id, "delivered")}
                              data-testid={`button-status-delivered-${order.id}`}
                            >
                              Livrée
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
