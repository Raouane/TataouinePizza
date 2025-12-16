import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, LogOut, Clock, Check, X, RefreshCw, AlertCircle, ArrowLeft, Flame, Package } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails?: string;
  status: string;
  totalPrice: string;
  createdAt?: string;
}

export default function RestaurantDashboard() {
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  const restaurantName = localStorage.getItem("restaurantName") || "Restaurant";
  const token = localStorage.getItem("restaurantToken");

  useEffect(() => {
    if (!token) {
      setLocation("/restaurant/login");
      return;
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/restaurant/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/restaurant/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      toast.success(`Statut mis à jour: ${getStatusLabel(newStatus)}`);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("restaurantToken");
    localStorage.removeItem("restaurantId");
    localStorage.removeItem("restaurantName");
    localStorage.removeItem("restaurantPhone");
    setLocation("/restaurant/login");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      baking: "bg-orange-100 text-orange-800",
      ready: "bg-green-100 text-green-800",
      delivery: "bg-indigo-100 text-indigo-800",
      delivered: "bg-emerald-100 text-emerald-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Acceptée",
      preparing: "En préparation",
      baking: "Au four",
      ready: "Prête",
      delivery: "En livraison",
      delivered: "Livrée",
      rejected: "Refusée",
    };
    return labels[status] || status;
  };

  const pendingOrders = orders.filter(o => o.status === "pending");
  const activeOrders = orders.filter(o => ["accepted", "preparing", "baking"].includes(o.status));
  const readyOrders = orders.filter(o => o.status === "ready");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 text-white p-2 rounded-full">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg">Tableau de bord</h1>
              <p className="text-sm text-muted-foreground">{restaurantName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button variant="outline" onClick={handleLogout} data-testid="button-restaurant-logout">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-yellow-500">
            <p className="text-sm text-muted-foreground">Nouvelles</p>
            <p className="text-3xl font-bold text-yellow-600">{pendingOrders.length}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-sm text-muted-foreground">En cours</p>
            <p className="text-3xl font-bold text-purple-600">{activeOrders.length}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-muted-foreground">Prêtes</p>
            <p className="text-3xl font-bold text-green-600">{readyOrders.length}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-blue-500">
            <p className="text-sm text-muted-foreground">Total aujourd'hui</p>
            <p className="text-3xl font-bold text-blue-600">{orders.length}</p>
          </Card>
        </div>

        {/* Actions header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold">Commandes</h2>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center">
            <ChefHat className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune commande</h3>
            <p className="text-muted-foreground">Les nouvelles commandes apparaîtront ici</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-6" data-testid={`card-order-${order.id}`}>
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
                        <p className="text-sm text-muted-foreground">{order.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm">{order.address}</p>
                        {order.addressDetails && (
                          <p className="text-sm text-muted-foreground">{order.addressDetails}</p>
                        )}
                      </div>
                    </div>

                    <p className="font-bold text-lg">{Number(order.totalPrice).toFixed(2)} TND</p>
                  </div>

                  {/* Actions based on status */}
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    {order.status === "pending" && (
                      <>
                        <Button
                          onClick={() => handleUpdateStatus(order.id, "accepted")}
                          disabled={updating === order.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {updating === order.id ? "..." : "Accepter"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleUpdateStatus(order.id, "rejected")}
                          disabled={updating === order.id}
                        >
                          <X className="w-4 h-4 mr-2" />
                          {updating === order.id ? "..." : "Refuser"}
                        </Button>
                      </>
                    )}

                    {order.status === "accepted" && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, "preparing")}
                        disabled={updating === order.id}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        {updating === order.id ? "..." : "En préparation"}
                      </Button>
                    )}

                    {order.status === "preparing" && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, "baking")}
                        disabled={updating === order.id}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Flame className="w-4 h-4 mr-2" />
                        {updating === order.id ? "..." : "Au four"}
                      </Button>
                    )}

                    {order.status === "baking" && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, "ready")}
                        disabled={updating === order.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        {updating === order.id ? "..." : "Prête!"}
                      </Button>
                    )}

                    {order.status === "ready" && (
                      <div className="text-center text-green-600 font-medium py-2">
                        ✅ En attente d'un livreur
                      </div>
                    )}

                    {order.status === "delivery" && (
                      <div className="text-center text-indigo-600 font-medium py-2">
                        🚗 En livraison
                      </div>
                    )}

                    {order.status === "delivered" && (
                      <div className="text-center text-emerald-600 font-medium py-2">
                        ✅ Livrée
                      </div>
                    )}

                    {order.status === "rejected" && (
                      <div className="text-center text-red-600 font-medium py-2">
                        ❌ Refusée
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
