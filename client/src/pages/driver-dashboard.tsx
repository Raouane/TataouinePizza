import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, LogOut, Phone, MapPin, Check, RefreshCw, AlertCircle, ArrowLeft, Package, Clock, Store, Banknote, Navigation } from "lucide-react";
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
  restaurantName?: string;
  restaurantAddress?: string;
  createdAt?: string;
}

const DRIVER_COMMISSION_RATE = 0.15; // 15% commission

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

  const handleStartDelivery = async (orderId: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: "delivery" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      toast.success("C'est parti! Bonne livraison!");
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
      accepted: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      baking: "bg-orange-100 text-orange-800",
      ready: "bg-green-100 text-green-800",
      delivery: "bg-indigo-100 text-indigo-800",
      delivered: "bg-emerald-100 text-emerald-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      accepted: "Acceptée",
      preparing: "En préparation",
      baking: "Au four",
      ready: "Prête à récupérer",
      delivery: "En livraison",
      delivered: "Livrée",
    };
    return labels[status] || status;
  };

  // Orders assigned to driver but not yet in delivery (waiting for restaurant)
  const waitingOrders = myOrders.filter(o => ["accepted", "preparing", "baking", "ready"].includes(o.status));
  const inDeliveryOrders = myOrders.filter(o => o.status === "delivery");
  const deliveredOrders = myOrders.filter(o => o.status === "delivered");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="bg-primary text-primary-foreground p-2 rounded-full flex-shrink-0">
                <Truck className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="font-serif font-bold text-base md:text-lg truncate">Espace Livreur</h1>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{driverName}</p>
              </div>
            </div>
            <div className="flex gap-1 md:gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setLocation("/")} data-testid="button-back-home" className="px-2 md:px-3">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline ml-2">Retour</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-driver-logout" className="px-2 md:px-3">
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline ml-2">Déconnexion</span>
              </Button>
            </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-muted-foreground">Disponibles</p>
            <p className="text-3xl font-bold text-green-600">{availableOrders.length}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-orange-500">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className="text-3xl font-bold text-orange-600">{waitingOrders.length}</p>
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
            <TabsTrigger value="waiting">
              En attente ({waitingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="my">
              En livraison ({inDeliveryOrders.length})
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
                {availableOrders.map((order) => {
                  const commission = Number(order.totalPrice) * DRIVER_COMMISSION_RATE;
                  return (
                  <Card key={order.id} className="overflow-hidden border-l-4 border-l-green-500" data-testid={`card-available-${order.id}`}>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                          <Banknote className="w-4 h-4" />
                          +{commission.toFixed(2)} TND
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2 text-orange-700 font-medium text-sm">
                          <Store className="w-4 h-4" />
                          Récupérer chez:
                        </div>
                        <p className="font-semibold">{order.restaurantName || "Restaurant"}</p>
                        <p className="text-sm text-muted-foreground">{order.restaurantAddress}</p>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                          <Navigation className="w-4 h-4" />
                          Livrer à:
                        </div>
                        <p className="font-semibold">{order.customerName}</p>
                        <p className="text-sm">{order.address}</p>
                        {order.addressDetails && (
                          <p className="text-xs text-muted-foreground">{order.addressDetails}</p>
                        )}
                        <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1">
                          <Phone className="w-3 h-3" />
                          {order.phone}
                        </a>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Total commande</p>
                          <p className="font-bold text-lg">{Number(order.totalPrice).toFixed(2)} TND</p>
                        </div>
                        <Button
                          onClick={() => handleAcceptOrder(order.id)}
                          disabled={updating === order.id}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`button-accept-${order.id}`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {updating === order.id ? "..." : "Accepter"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="waiting" className="mt-4">
            {waitingOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune commande en attente</h3>
                <p className="text-muted-foreground">Vos commandes assignées en cours de préparation apparaîtront ici</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {waitingOrders.map((order) => {
                  const commission = Number(order.totalPrice) * DRIVER_COMMISSION_RATE;
                  return (
                  <Card key={order.id} className="overflow-hidden border-l-4 border-l-orange-500" data-testid={`card-waiting-${order.id}`}>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                          <Banknote className="w-4 h-4" />
                          +{commission.toFixed(2)} TND
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2 text-orange-700 font-medium text-sm">
                          <Store className="w-4 h-4" />
                          Récupérer chez:
                        </div>
                        <p className="font-semibold">{order.restaurantName || "Restaurant"}</p>
                        <p className="text-sm text-muted-foreground">{order.restaurantAddress}</p>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                          <Navigation className="w-4 h-4" />
                          Livrer à:
                        </div>
                        <p className="font-semibold">{order.customerName}</p>
                        <p className="text-sm">{order.address}</p>
                        {order.addressDetails && (
                          <p className="text-xs text-muted-foreground">{order.addressDetails}</p>
                        )}
                        <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1">
                          <Phone className="w-3 h-3" />
                          {order.phone}
                        </a>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Total commande</p>
                          <p className="font-bold text-lg">{Number(order.totalPrice).toFixed(2)} TND</p>
                        </div>
                        {order.status === "ready" ? (
                          <Button
                            onClick={() => handleStartDelivery(order.id)}
                            disabled={updating === order.id}
                            className="bg-indigo-600 hover:bg-indigo-700"
                            data-testid={`button-start-delivery-${order.id}`}
                          >
                            <Truck className="w-4 h-4 mr-2" />
                            {updating === order.id ? "..." : "Partir livrer"}
                          </Button>
                        ) : (
                          <div className="text-center text-orange-600 font-medium py-2 px-4 bg-orange-100 rounded-lg text-sm">
                            En préparation...
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                  );
                })}
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
                {inDeliveryOrders.map((order) => {
                  const commission = Number(order.totalPrice) * DRIVER_COMMISSION_RATE;
                  return (
                  <Card key={order.id} className="overflow-hidden border-l-4 border-l-indigo-500" data-testid={`card-delivery-${order.id}`}>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                          <Banknote className="w-4 h-4" />
                          +{commission.toFixed(2)} TND
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                          <Navigation className="w-4 h-4" />
                          Livrer à:
                        </div>
                        <p className="font-semibold">{order.customerName}</p>
                        <p className="text-sm">{order.address}</p>
                        {order.addressDetails && (
                          <p className="text-xs text-muted-foreground">{order.addressDetails}</p>
                        )}
                        <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1">
                          <Phone className="w-3 h-3" />
                          {order.phone}
                        </a>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Total commande</p>
                          <p className="font-bold text-lg">{Number(order.totalPrice).toFixed(2)} TND</p>
                        </div>
                        <Button
                          onClick={() => handleDelivered(order.id)}
                          disabled={updating === order.id}
                          className="bg-emerald-600 hover:bg-emerald-700"
                          data-testid={`button-delivered-${order.id}`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {updating === order.id ? "..." : "Confirmer livraison"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                  );
                })}
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
                {deliveredOrders.map((order) => {
                  const commission = Number(order.totalPrice) * DRIVER_COMMISSION_RATE;
                  return (
                  <Card key={order.id} className="overflow-hidden opacity-80" data-testid={`card-completed-${order.id}`}>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-100 text-emerald-800">
                            Livrée
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-700 font-medium text-sm">
                          <Banknote className="w-4 h-4" />
                          +{commission.toFixed(2)} TND
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-muted-foreground">{order.address}</p>
                        </div>
                        <p className="font-bold">{Number(order.totalPrice).toFixed(2)} TND</p>
                      </div>
                    </div>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
