import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, LogOut, Phone, MapPin, Check, RefreshCw, AlertCircle, ArrowLeft, Package } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails?: string;
  status: string;
  totalPrice: string;
  restaurantId?: string;
  createdAt?: string;
}

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  const driverName = localStorage.getItem("driverName") || "Livreur";
  const token = localStorage.getItem("driverToken");

  useEffect(() => {
    if (!token) {
      setLocation("/driver/login");
      return;
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchOrders = async () => {
    try {
      const [availableRes, myRes] = await Promise.all([
        fetch("/api/driver/available-orders", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/driver/orders", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      if (availableRes.ok) {
        const data = await availableRes.json();
        setAvailableOrders(data);
      }
      if (myRes.ok) {
        const data = await myRes.json();
        setMyOrders(data);
      }
      setError("");
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/accept`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      toast.success("Commande acceptée! En livraison.");
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleDelivered = async (orderId: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: "delivered" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      toast.success("Commande livrée!");
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverId");
    localStorage.removeItem("driverName");
    localStorage.removeItem("driverPhone");
    setLocation("/driver/login");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ready: "bg-green-100 text-green-800",
      delivery: "bg-indigo-100 text-indigo-800",
      delivered: "bg-emerald-100 text-emerald-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ready: "Prête",
      delivery: "En livraison",
      delivered: "Livrée",
    };
    return labels[status] || status;
  };

  const inDeliveryOrders = myOrders.filter(o => o.status === "delivery");
  const deliveredOrders = myOrders.filter(o => o.status === "delivered");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-full">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg">Tableau de bord</h1>
              <p className="text-sm text-muted-foreground">Bienvenue, {driverName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button variant="outline" onClick={handleLogout} data-testid="button-driver-logout">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="flex gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-muted-foreground">Disponibles</p>
            <p className="text-3xl font-bold text-green-600">{availableOrders.length}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-indigo-500">
            <p className="text-sm text-muted-foreground">En livraison</p>
            <p className="text-3xl font-bold text-indigo-600">{inDeliveryOrders.length}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <p className="text-sm text-muted-foreground">Livrées</p>
            <p className="text-3xl font-bold text-emerald-600">{deliveredOrders.length}</p>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold">Commandes</h2>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <Tabs defaultValue="available">
          <TabsList>
            <TabsTrigger value="available">
              Disponibles ({availableOrders.length})
            </TabsTrigger>
            <TabsTrigger value="my">
              Mes livraisons ({inDeliveryOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Historique ({deliveredOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Chargement...</div>
            ) : availableOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune commande disponible</h3>
                <p className="text-muted-foreground">
                  Les commandes prêtes apparaîtront ici. Premier arrivé, premier servi!
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {availableOrders.map((order) => (
                  <Card key={order.id} className="p-6 border-l-4 border-l-green-500" data-testid={`card-available-${order.id}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4" />
                              <a href={`tel:${order.phone}`} className="hover:text-primary">{order.phone}</a>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p>{order.address}</p>
                              {order.addressDetails && (
                                <p className="text-muted-foreground">{order.addressDetails}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="font-bold text-lg">{Number(order.totalPrice).toFixed(2)} TND</p>
                      </div>

                      <Button
                        onClick={() => handleAcceptOrder(order.id)}
                        disabled={updating === order.id}
                        className="bg-green-600 hover:bg-green-700 min-w-[150px]"
                        data-testid={`button-accept-${order.id}`}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {updating === order.id ? "..." : "Prendre"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my" className="mt-4">
            {inDeliveryOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune livraison en cours</h3>
                <p className="text-muted-foreground">Acceptez une commande disponible</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {inDeliveryOrders.map((order) => (
                  <Card key={order.id} className="p-6 border-l-4 border-l-indigo-500" data-testid={`card-delivery-${order.id}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4" />
                              <a href={`tel:${order.phone}`} className="hover:text-primary">{order.phone}</a>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p>{order.address}</p>
                              {order.addressDetails && (
                                <p className="text-muted-foreground">{order.addressDetails}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="font-bold text-lg">{Number(order.totalPrice).toFixed(2)} TND</p>
                      </div>

                      <Button
                        onClick={() => handleDelivered(order.id)}
                        disabled={updating === order.id}
                        className="bg-emerald-600 hover:bg-emerald-700 min-w-[150px]"
                        data-testid={`button-delivered-${order.id}`}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {updating === order.id ? "..." : "Livrée"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {deliveredOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <Check className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune livraison terminée</h3>
                <p className="text-muted-foreground">Vos livraisons complétées apparaîtront ici</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {deliveredOrders.map((order) => (
                  <Card key={order.id} className="p-6 opacity-75" data-testid={`card-completed-${order.id}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">{order.address}</p>
                        <p className="font-bold">{Number(order.totalPrice).toFixed(2)} TND</p>
                      </div>
                      <div className="text-emerald-600 font-medium">✅ Livrée</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
