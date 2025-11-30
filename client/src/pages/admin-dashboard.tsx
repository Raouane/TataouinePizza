import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminOrders, updateOrderStatus } from "@/lib/api";
import type { Order } from "@/lib/api";
import { LogOut, RefreshCw, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    if (!token) {
      setLocation("/admin/login");
      return;
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) return;
      const data = await getAdminOrders(token);
      setOrders(data);
      setError("");
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Not authenticated");
      
      await updateOrderStatus(orderId, newStatus, token);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour");
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setLocation("/admin/login");
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

  const statuses = ["pending", "accepted", "preparing", "baking", "ready", "delivery", "delivered", "rejected"] as const;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Gérez les commandes de Tataouine Pizza</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>

        {error && (
          <div className="flex gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-3xl font-bold">{orders.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">En attente</p>
            <p className="text-3xl font-bold text-yellow-600">
              {orders.filter(o => o.status === "pending").length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">En préparation</p>
            <p className="text-3xl font-bold text-orange-600">
              {orders.filter(o => ["preparing", "baking"].includes(o.status)).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Livrées</p>
            <p className="text-3xl font-bold text-green-600">
              {orders.filter(o => o.status === "delivered").length}
            </p>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Commande</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Téléphone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Adresse</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Chargement des commandes...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Aucune commande pour le moment
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">
                        {order.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{order.customerName}</td>
                      <td className="px-4 py-3 text-sm">{order.phone}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-xs">
                        {order.address}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {Number(order.totalPrice).toFixed(2)} TND
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                          disabled={updating === order.id}
                        >
                          <SelectTrigger className={`w-40 ${getStatusColor(order.status)}`} data-testid={`select-status-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status === "pending" && "En attente"}
                                {status === "accepted" && "Acceptée"}
                                {status === "preparing" && "Préparation"}
                                {status === "baking" && "Cuisson"}
                                {status === "ready" && "Prête"}
                                {status === "delivery" && "En livraison"}
                                {status === "delivered" && "Livrée"}
                                {status === "rejected" && "Rejetée"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mise à jour automatique toutes les 5 secondes
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              disabled={loading}
              className="gap-2"
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
