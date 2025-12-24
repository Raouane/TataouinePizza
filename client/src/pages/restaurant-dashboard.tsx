import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, LogOut, Check, X, RefreshCw, AlertCircle, ArrowLeft, Package, Banknote, Calendar, Menu, BarChart3, User, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getStatusColor, getStatusLabel } from "@/lib/order-status-helpers";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  const [showWeek, setShowWeek] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const restaurantName = localStorage.getItem("restaurantName") || "Restaurant";
  const token = localStorage.getItem("restaurantToken");

  useEffect(() => {
    if (!token) {
      setLocation("/restaurant/login");
      return;
    }
    fetchOrders();
    fetchStatus();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [token, setLocation]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/restaurant/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsOpen(data.isOpen);
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  const toggleStatus = async () => {
    try {
      const res = await fetch("/api/restaurant/toggle-status", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsOpen(data.isOpen);
        toast.success(data.isOpen ? "Restaurant ouvert" : "Restaurant fermé");
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
      toast.error("Erreur lors du changement de statut");
    }
  };

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

  // Utiliser les helpers centralisés (déjà importés)

  const pendingOrders = orders.filter(o => o.status === "pending");
  const activeOrders = orders.filter(o => o.status === "accepted");
  const readyOrders = orders.filter(o => o.status === "ready");

  // Calculate revenue
  const deliveredOrders = orders.filter(o => o.status === "delivered");
  
  // Total revenue (all delivered orders)
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
  const totalOrdersCount = deliveredOrders.length;
  
  // Try to calculate today/week if dates are available
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const todayOrders = deliveredOrders.filter(o => {
    if (!o.createdAt) return true; // Include if no date (show all)
    return new Date(o.createdAt) >= startOfDay;
  });
  
  const weekOrders = deliveredOrders.filter(o => {
    if (!o.createdAt) return true; // Include if no date
    return new Date(o.createdAt) >= startOfWeek;
  });
  
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
  const weekRevenue = weekOrders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
  const todayOrdersCount = todayOrders.length;
  const weekOrdersCount = weekOrders.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simplifié */}
      <div className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="bg-orange-600 text-white p-2 rounded-full flex-shrink-0">
                <ChefHat className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="font-serif font-bold text-base md:text-lg truncate">Espace Restaurant</h1>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{restaurantName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={fetchOrders} className="px-2 md:px-3">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Sheet open={showMenu} onOpenChange={setShowMenu}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="px-2 md:px-3">
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 sm:w-96">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Menu
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-2">
                    {/* Statistiques */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => {
                        setShowStatsDialog(true);
                        setShowMenu(false);
                      }}
                    >
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Statistiques</p>
                        <p className="text-xs text-muted-foreground">Revenus et commandes</p>
                      </div>
                    </Button>

                    {/* Statut Ouvert/Fermé */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Power className={`w-5 h-5 ${isOpen ? 'text-green-600' : 'text-red-600'}`} />
                          <span className="font-medium">Statut</span>
                        </div>
                        <Switch checked={isOpen} onCheckedChange={toggleStatus} />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={isOpen ? 'text-green-700' : 'text-red-700'}>
                          {isOpen ? "Restaurant ouvert" : "Restaurant fermé"}
                        </span>
                      </div>
                    </div>

                    {/* Profil */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => {
                        toast.info("Profil - Fonctionnalité à venir");
                        setShowMenu(false);
                      }}
                    >
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Profil</p>
                        <p className="text-xs text-muted-foreground">{restaurantName}</p>
                      </div>
                    </Button>

                    {/* Déconnexion */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        handleLogout();
                        setShowMenu(false);
                      }}
                    >
                      <div className="bg-red-100 p-2 rounded-lg">
                        <LogOut className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Déconnexion</p>
                        <p className="text-xs text-muted-foreground">Quitter l'application</p>
                      </div>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Page principale - SEULEMENT les commandes */}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {error && (
          <div className="mb-4 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

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

      {/* Modal Statistiques */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              Statistiques
            </DialogTitle>
            <DialogDescription>
              Vos revenus et statistiques de commandes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Chiffre d'affaires avec toggle */}
            <Card className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-orange-100 text-sm">
                  {showWeek ? "Chiffre d'affaires (semaine)" : "Chiffre d'affaires (aujourd'hui)"}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowWeek(!showWeek)}
                  className="h-6 px-2 text-[10px] bg-white/20 hover:bg-white/30 text-white"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  {showWeek ? "Jour" : "Semaine"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold mt-1">
                    {showWeek ? weekRevenue.toFixed(2) : todayRevenue.toFixed(2)} TND
                  </p>
                  <p className="text-orange-100 text-xs mt-1">
                    {showWeek ? weekOrdersCount : todayOrdersCount} commande{(showWeek ? weekOrdersCount : todayOrdersCount) > 1 ? 's' : ''} livrée{(showWeek ? weekOrdersCount : todayOrdersCount) > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Banknote className="w-8 h-8" />
                </div>
              </div>
            </Card>

            {/* Stats détaillées */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 text-center border-l-4 border-l-yellow-500">
                <p className="text-xs text-muted-foreground mb-1">Nouvelles</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingOrders.length}</p>
              </Card>
              <Card className="p-3 text-center border-l-4 border-l-purple-500">
                <p className="text-xs text-muted-foreground mb-1">En cours</p>
                <p className="text-2xl font-bold text-purple-600">{activeOrders.length}</p>
              </Card>
              <Card className="p-3 text-center border-l-4 border-l-green-500">
                <p className="text-xs text-muted-foreground mb-1">Prêtes</p>
                <p className="text-2xl font-bold text-green-600">{readyOrders.length}</p>
              </Card>
              <Card className="p-3 text-center border-l-4 border-l-blue-500">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
              </Card>
            </div>

            {/* Détails revenus */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Détails des revenus</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aujourd'hui</span>
                  <span className="font-medium">{todayRevenue.toFixed(2)} TND</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cette semaine</span>
                  <span className="font-medium">{weekRevenue.toFixed(2)} TND</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total (toutes)</span>
                  <span className="font-medium">{totalRevenue.toFixed(2)} TND</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Commandes totales</span>
                  <span className="font-medium">{totalOrdersCount}</span>
                </div>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
