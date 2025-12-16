import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, LogOut, Phone, MapPin, Clock, Check, X, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails?: string;
  status: string;
  totalPrice: string;
  driverId?: string;
  createdAt?: string;
}

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState("");

  const driverName = localStorage.getItem("driverName") || "Livreur";
  const driverPhone = localStorage.getItem("driverPhone") || "";
  const token = localStorage.getItem("driverToken");

  useEffect(() => {
    if (!token) {
      setLocation("/driver/login");
      return;
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Temps réel toutes les 5 secondes
    return () => clearInterval(interval);
  }, [token]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/driver/orders", {
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
      toast.success("Commande acceptée!");
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/reject`, {
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
      toast.success("Commande refusée");
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/status`, {
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
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverId");
    localStorage.removeItem("driverName");
    localStorage.removeItem("driverPhone");
    setLocation("/driver/login");
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

  const filteredOrders = statusFilter === "all" 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const pendingCount = orders.filter(o => o.status === "pending" || o.status === "ready").length;
  const inDeliveryCount = orders.filter(o => o.status === "delivery").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total assignées</p>
            <p className="text-3xl font-bold">{orders.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">En livraison</p>
            <p className="text-3xl font-bold text-indigo-600">{inDeliveryCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Livrées</p>
            <p className="text-3xl font-bold text-green-600">{deliveredCount}</p>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold">Vos Commandes</h2>
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="ready">Prêtes</SelectItem>
                <SelectItem value="delivery">En livraison</SelectItem>
                <SelectItem value="delivered">Livrées</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchOrders}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Chargement des commandes...
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune commande</h3>
            <p className="text-muted-foreground">
              {statusFilter === "all" 
                ? "Aucune commande assignée pour le moment" 
                : `Aucune commande avec le statut "${getStatusLabel(statusFilter)}"`}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="p-6" data-testid={`card-order-${order.id}`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Order Info */}
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
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${order.phone}`} className="hover:text-primary">
                            {order.phone}
                          </a>
                        </div>
                      </div>
                      <div className="space-y-2">
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
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-bold text-lg">{Number(order.totalPrice).toFixed(2)} TND</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    {/* Pending: Accept/Reject buttons */}
                    {(order.status === "pending" || order.status === "ready") && (
                      <>
                        <Button
                          onClick={() => handleAcceptOrder(order.id)}
                          disabled={updating === order.id}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`button-accept-${order.id}`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {updating === order.id ? "..." : "Accepter"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleRejectOrder(order.id)}
                          disabled={updating === order.id}
                          data-testid={`button-reject-${order.id}`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          {updating === order.id ? "..." : "Refuser"}
                        </Button>
                      </>
                    )}

                    {/* Accepted: Start delivery */}
                    {order.status === "accepted" && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, "delivery")}
                        disabled={updating === order.id}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        {updating === order.id ? "..." : "Démarrer livraison"}
                      </Button>
                    )}

                    {/* In Delivery: Mark as delivered */}
                    {order.status === "delivery" && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, "delivered")}
                        disabled={updating === order.id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {updating === order.id ? "..." : "Marquer livrée"}
                      </Button>
                    )}

                    {/* Delivered: Done */}
                    {order.status === "delivered" && (
                      <div className="text-center text-emerald-600 font-medium py-2">
                        ✅ Livrée avec succès
                      </div>
                    )}

                    {/* Rejected: Info */}
                    {order.status === "rejected" && (
                      <div className="text-center text-red-600 font-medium py-2">
                        ❌ Commande refusée
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
