import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getAdminOrders, updateOrderStatus, getAdminDrivers, assignOrderToDriver, getAdminRestaurants, createRestaurant, updateRestaurant, deleteRestaurant, createDriver, updateDriver, deleteDriver, getAdminPizzas, createPizza, updatePizza, deletePizza } from "@/lib/api";
import type { Order, Driver, Restaurant, Pizza } from "@/lib/api";
import { LogOut, RefreshCw, AlertCircle, Plus, Store, Bike, Pizza as PizzaIcon, ShoppingCart, Edit, Trash2, MapPin, Phone, User, Calendar, Package, Menu, BarChart3, Settings, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getStatusColor, getCardHeaderColor, getStatusLabel } from "@/lib/order-status-helpers";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OrderDetailsDialog } from "@/components/order-details-dialog";
import { isRestaurantOpen } from "@/lib/restaurant-status";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("orders");
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const token = localStorage.getItem("adminToken");

  // Form states
  const [restaurantForm, setRestaurantForm] = useState({ 
    name: "", 
    phone: "", 
    address: "", 
    description: "", 
    imageUrl: "", 
    categories: [] as string[],
    openingHours: "",
    closedDay: "",
    deliveryTime: 30,
    minOrder: "0",
    rating: "4.5"
  });
  const [driverForm, setDriverForm] = useState({ name: "", phone: "", password: "" });
  const [pizzaForm, setPizzaForm] = useState({ restaurantId: "", name: "", description: "", productType: "pizza", category: "classic", imageUrl: "", available: true, prices: [{ size: "small", price: 10 }, { size: "medium", price: 15 }, { size: "large", price: 18 }] });
  const [showRestaurantDialog, setShowRestaurantDialog] = useState(false);
  const [showEditRestaurantDialog, setShowEditRestaurantDialog] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [showDriverDialog, setShowDriverDialog] = useState(false);
  const [showEditDriverDialog, setShowEditDriverDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showPizzaDialog, setShowPizzaDialog] = useState(false);
  const [showEditPizzaDialog, setShowEditPizzaDialog] = useState(false);
  const [editingPizza, setEditingPizza] = useState<Pizza | null>(null);

  useEffect(() => {
    if (!token) {
      setLocation("/admin/login");
      return;
    }
    fetchAll();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [token, setLocation]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchOrders(), fetchDrivers(), fetchRestaurants(), fetchPizzas()]);
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        console.error("[ADMIN] Token manquant pour fetchRestaurants");
        setLocation("/admin/login");
        return;
      }
      console.log("[ADMIN] Récupération des restaurants...");
      const data = await getAdminRestaurants(token);
      console.log("[ADMIN] Restaurants reçus:", data.length);
      console.log("[ADMIN] Détails des restaurants:", data.map(r => ({
        id: r.id,
        name: r.name,
        isOpen: r.isOpen,
        isOpenType: typeof r.isOpen,
        openingHours: r.openingHours
      })));
      
      // Log spécifique pour BOUBA
      const bouba = data.find(r => r.name && r.name.toLowerCase().includes('bouba'));
      if (bouba) {
        console.log("[ADMIN] BOUBA trouvé - openingHours:", bouba.openingHours, "type:", typeof bouba.openingHours);
      }
      setRestaurants(data);
    } catch (err: any) {
      console.error("[ADMIN] Failed to fetch restaurants:", err);
      if (err.message?.includes("401") || err.message?.includes("token") || err.message?.includes("Invalid")) {
        localStorage.removeItem("adminToken");
        setLocation("/admin/login");
      }
    }
  };

  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        console.error("[ADMIN] Token manquant pour fetchDrivers");
        setLocation("/admin/login");
        return;
      }
      const data = await getAdminDrivers(token);
      setDrivers(data);
    } catch (err: any) {
      console.error("Failed to fetch drivers:", err);
      if (err.message?.includes("401") || err.message?.includes("token") || err.message?.includes("Invalid")) {
        localStorage.removeItem("adminToken");
        setLocation("/admin/login");
      }
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) return;
      const data = await getAdminOrders(token);
      setOrders(data);
      setError("");
    } catch (err: any) {
      console.error("Failed to fetch orders:", err);
      if (err.message?.includes("401") || err.message?.includes("token") || err.message?.includes("Invalid")) {
        localStorage.removeItem("adminToken");
        setLocation("/admin/login");
      }
    }
  };

  const fetchPizzas = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        console.error("[ADMIN] Token manquant pour fetchPizzas");
        setLocation("/admin/login");
        return;
      }
      const data = await getAdminPizzas(token);
      setPizzas(data);
    } catch (err: any) {
      console.error("Failed to fetch pizzas:", err);
      if (err.message?.includes("401") || err.message?.includes("token") || err.message?.includes("Invalid")) {
        localStorage.removeItem("adminToken");
        setLocation("/admin/login");
      }
    }
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    
    // Parser les horaires et jour de repos
    let openingHours = "";
    let closedDay = "";
    if (restaurant.openingHours) {
      const parts = restaurant.openingHours.split("|");
      openingHours = parts[0]?.trim() || "";
      closedDay = parts[1]?.trim() || "";
    }
    
    console.log("[ADMIN] handleEditRestaurant - Restaurant:", restaurant.name);
    console.log("[ADMIN] handleEditRestaurant - openingHours brut:", restaurant.openingHours);
    console.log("[ADMIN] handleEditRestaurant - openingHours parsé:", openingHours);
    console.log("[ADMIN] handleEditRestaurant - closedDay:", closedDay);
    
    setRestaurantForm({
      name: restaurant.name,
      phone: restaurant.phone,
      address: restaurant.address,
      description: restaurant.description || "",
      imageUrl: restaurant.imageUrl || "",
      categories: restaurant.categories || [],
      openingHours: openingHours, // Format: "15:00-23:00" - sera parsé dans les champs time
      closedDay: closedDay || "none",
      deliveryTime: restaurant.deliveryTime || 30,
      minOrder: restaurant.minOrder?.toString() || "0",
      rating: restaurant.rating?.toString() || "4.5",
    });
    setShowEditRestaurantDialog(true);
  };

  const handleUpdateRestaurant = async () => {
    if (!editingRestaurant) return;
    try {
      if (!token) {
        toast.error("Non authentifié. Veuillez vous reconnecter.");
        setLocation("/admin/login");
        return;
      }
      if (!restaurantForm.name || !restaurantForm.phone || !restaurantForm.address) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      if (!restaurantForm.categories || restaurantForm.categories.length === 0) {
        toast.error("Veuillez sélectionner au moins une catégorie de produit");
        return;
      }
      
      // Construire openingHours avec le jour de repos si nécessaire
      let openingHours = restaurantForm.openingHours;
      
      // Nettoyer openingHours : supprimer les formats invalides comme "-" ou "23:00-" ou "-23:00"
      if (openingHours) {
        const hoursPart = openingHours.split("|")[0] || "";
        const [openTime, closeTime] = hoursPart.split("-");
        // Si un des deux horaires est vide ou invalide, considérer comme pas d'horaires
        if (!openTime || !closeTime || openTime.trim() === "" || closeTime.trim() === "") {
          openingHours = "";
        }
      }
      
      if (restaurantForm.closedDay && restaurantForm.closedDay !== "none") {
        if (openingHours && openingHours.trim() !== "") {
          openingHours = `${openingHours}|${restaurantForm.closedDay}`;
        } else {
          // Si seulement jour de repos sans horaires, utiliser des horaires par défaut
          openingHours = `09:00-23:00|${restaurantForm.closedDay}`;
        }
      }
      
      const restaurantData: any = {
        name: restaurantForm.name,
        phone: restaurantForm.phone,
        address: restaurantForm.address,
        description: restaurantForm.description,
        imageUrl: restaurantForm.imageUrl,
        categories: restaurantForm.categories,
        deliveryTime: restaurantForm.deliveryTime,
        minOrder: restaurantForm.minOrder,
        rating: restaurantForm.rating,
        // Toujours inclure openingHours dans restaurantData
        // Si c'est une chaîne vide, l'envoyer comme chaîne vide (sera converti en null côté serveur)
        // Si c'est undefined ou null, l'envoyer comme null explicitement
        openingHours: openingHours !== undefined && openingHours !== null ? openingHours : null,
      };
      
      console.log("[ADMIN] handleUpdateRestaurant - Données à envoyer:", restaurantData);
      console.log("[ADMIN] handleUpdateRestaurant - openingHours brut:", restaurantForm.openingHours);
      console.log("[ADMIN] handleUpdateRestaurant - closedDay:", restaurantForm.closedDay);
      console.log("[ADMIN] handleUpdateRestaurant - openingHours final:", openingHours);
      console.log("[ADMIN] handleUpdateRestaurant - openingHours dans restaurantData:", restaurantData.openingHours);
      
      await updateRestaurant(editingRestaurant.id, restaurantData, token);
      toast.success("Restaurant modifié avec succès!");
      setShowEditRestaurantDialog(false);
      setEditingRestaurant(null);
      setRestaurantForm({ 
        name: "", 
        phone: "", 
        address: "", 
        description: "", 
        imageUrl: "", 
        categories: [],
        openingHours: "",
        closedDay: "",
        deliveryTime: 30,
        minOrder: "0",
        rating: "4.5"
      });
      await fetchRestaurants();
    } catch (err: any) {
      console.error("Erreur lors de la modification du restaurant:", err);
      toast.error(err.message || "Erreur lors de la modification");
    }
  };

  const handleDeleteRestaurant = async (restaurantId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce restaurant ? Cette action est irréversible.")) {
      return;
    }
    try {
      if (!token) {
        toast.error("Non authentifié");
        return;
      }
      await deleteRestaurant(restaurantId, token);
      toast.success("Restaurant supprimé avec succès!");
      await fetchRestaurants();
    } catch (err: any) {
      console.error("Erreur lors de la suppression du restaurant:", err);
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const handleCreateRestaurant = async () => {
    try {
      if (!token) {
        toast.error("Non authentifié. Veuillez vous reconnecter.");
        setLocation("/admin/login");
        return;
      }
      if (!restaurantForm.name || !restaurantForm.phone || !restaurantForm.address) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      if (!restaurantForm.categories || restaurantForm.categories.length === 0) {
        toast.error("Veuillez sélectionner au moins une catégorie de produit");
        return;
      }
      // Construire openingHours avec le jour de repos si nécessaire
      let openingHours = restaurantForm.openingHours;
      
      // Nettoyer openingHours : supprimer les formats invalides comme "-" ou "23:00-" ou "-23:00"
      if (openingHours) {
        const hoursPart = openingHours.split("|")[0] || "";
        const [openTime, closeTime] = hoursPart.split("-");
        // Si un des deux horaires est vide ou invalide, considérer comme pas d'horaires
        if (!openTime || !closeTime || openTime.trim() === "" || closeTime.trim() === "") {
          openingHours = "";
        }
      }
      
      if (restaurantForm.closedDay && restaurantForm.closedDay !== "none") {
        if (openingHours && openingHours.trim() !== "") {
          openingHours = `${openingHours}|${restaurantForm.closedDay}`;
        } else {
          // Si seulement jour de repos sans horaires, utiliser des horaires par défaut
          openingHours = `09:00-23:00|${restaurantForm.closedDay}`;
        }
      }
      
      const restaurantData: any = {
        name: restaurantForm.name,
        phone: restaurantForm.phone,
        address: restaurantForm.address,
        description: restaurantForm.description,
        imageUrl: restaurantForm.imageUrl,
        categories: restaurantForm.categories,
        deliveryTime: restaurantForm.deliveryTime,
        minOrder: restaurantForm.minOrder,
        rating: restaurantForm.rating,
      };
      
      // Toujours inclure openingHours, même si c'est une chaîne vide (sera converti en null côté serveur)
      if (openingHours !== undefined && openingHours !== null) {
        restaurantData.openingHours = openingHours;
      } else {
        restaurantData.openingHours = null;
      }
      
      console.log("Création du restaurant avec:", restaurantData);
      console.log("Token:", token ? "Présent" : "Absent");
      const result = await createRestaurant(restaurantData, token);
      console.log("Restaurant créé:", result);
      toast.success("Restaurant créé avec succès!");
      setRestaurantForm({ 
        name: "", 
        phone: "", 
        address: "", 
        description: "", 
        imageUrl: "", 
        categories: [],
        openingHours: "",
        closedDay: "",
        deliveryTime: 30,
        minOrder: "0",
        rating: "4.5"
      });
      setShowRestaurantDialog(false);
      await fetchRestaurants();
    } catch (err: any) {
      console.error("Erreur lors de la création du restaurant:", err);
      const errorMessage = err.message || "Erreur lors de la création";
      toast.error(errorMessage);
      // Si l'erreur indique un problème d'authentification, rediriger vers login
      if (errorMessage.includes("401") || errorMessage.includes("token") || errorMessage.includes("authentifié")) {
        setLocation("/admin/login");
      }
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setDriverForm({
      name: driver.name,
      phone: driver.phone,
      password: "", // Ne pas pré-remplir le mot de passe
    });
    setShowEditDriverDialog(true);
  };

  const handleUpdateDriver = async () => {
    if (!editingDriver) return;
    try {
      if (!token) {
        toast.error("Non authentifié. Veuillez vous reconnecter.");
        setLocation("/admin/login");
        return;
      }
      if (!driverForm.name || !driverForm.phone) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      // Le mot de passe est optionnel lors de la modification
      const updateData: { name: string; phone: string; password?: string } = {
        name: driverForm.name,
        phone: driverForm.phone,
      };
      if (driverForm.password && driverForm.password.trim() !== "") {
        updateData.password = driverForm.password;
      }
      await updateDriver(editingDriver.id, updateData, token);
      toast.success("Livreur modifié avec succès!");
      setShowEditDriverDialog(false);
      setEditingDriver(null);
      setDriverForm({ name: "", phone: "", password: "" });
      await fetchDrivers();
    } catch (err: any) {
      console.error("Erreur lors de la modification du livreur:", err);
      toast.error(err.message || "Erreur lors de la modification");
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce livreur ? Cette action est irréversible.")) {
      return;
    }
    try {
      if (!token) {
        toast.error("Non authentifié");
        return;
      }
      await deleteDriver(driverId, token);
      toast.success("Livreur supprimé avec succès!");
      await fetchDrivers();
    } catch (err: any) {
      console.error("Erreur lors de la suppression du livreur:", err);
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const handleCreateDriver = async () => {
    try {
      if (!token) throw new Error("Not authenticated");
      if (!driverForm.name || !driverForm.phone || !driverForm.password) {
        toast.error("Veuillez remplir tous les champs");
        return;
      }
      await createDriver(driverForm, token);
      toast.success("Livreur créé avec succès!");
      setDriverForm({ name: "", phone: "", password: "" });
      setShowDriverDialog(false);
      await fetchDrivers();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    }
  };

  const handleEditPizza = (pizza: Pizza) => {
    setEditingPizza(pizza);
    setPizzaForm({
      restaurantId: pizza.restaurantId || "",
      name: pizza.name,
      description: pizza.description || "",
      productType: pizza.productType || "pizza",
      category: pizza.category,
      imageUrl: pizza.imageUrl || "",
      available: pizza.available !== false,
      prices: pizza.prices && pizza.prices.length > 0 
        ? pizza.prices.map((p: any) => ({ size: p.size, price: parseFloat(p.price) || 0 }))
        : [{ size: "small", price: 10 }, { size: "medium", price: 15 }, { size: "large", price: 18 }],
    });
    setShowEditPizzaDialog(true);
  };

  const handleUpdatePizza = async () => {
    if (!editingPizza) return;
    try {
      if (!token) {
        toast.error("Non authentifié. Veuillez vous reconnecter.");
        setLocation("/admin/login");
        return;
      }
      if (!pizzaForm.name || !pizzaForm.category || !pizzaForm.productType) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      await updatePizza(editingPizza.id, pizzaForm, token);
      toast.success("Produit modifié avec succès!");
      setShowEditPizzaDialog(false);
      setEditingPizza(null);
      setPizzaForm({ restaurantId: "", name: "", description: "", productType: "pizza", category: "classic", imageUrl: "", available: true, prices: [{ size: "small", price: 10 }, { size: "medium", price: 15 }, { size: "large", price: 18 }] });
      await fetchPizzas();
    } catch (err: any) {
      console.error("Erreur lors de la modification du produit:", err);
      toast.error(err.message || "Erreur lors de la modification");
    }
  };

  const handleDeletePizza = async (pizzaId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.")) {
      return;
    }
    try {
      if (!token) {
        toast.error("Non authentifié");
        return;
      }
      await deletePizza(pizzaId, token);
      toast.success("Produit supprimé avec succès!");
      await fetchPizzas();
    } catch (err: any) {
      console.error("Erreur lors de la suppression du produit:", err);
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const handleCreatePizza = async () => {
    try {
      if (!token) {
        toast.error("Non authentifié. Veuillez vous reconnecter.");
        setLocation("/admin/login");
        return;
      }
      if (!pizzaForm.restaurantId || !pizzaForm.name || !pizzaForm.category || !pizzaForm.productType) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      console.log("Création du produit avec:", pizzaForm);
      await createPizza(pizzaForm, token);
      toast.success("Produit créé avec succès!");
      setPizzaForm({ restaurantId: "", name: "", description: "", productType: "pizza", category: "classic", imageUrl: "", available: true, prices: [{ size: "small", price: 10 }, { size: "medium", price: 15 }, { size: "large", price: 18 }] });
      setShowPizzaDialog(false);
      await fetchPizzas();
    } catch (err: any) {
      console.error("Erreur lors de la création du produit:", err);
      const errorMessage = err.message || "Erreur lors de la création";
      toast.error(errorMessage);
      // Si l'erreur indique un problème d'authentification, rediriger vers login
      if (errorMessage.includes("401") || errorMessage.includes("token") || errorMessage.includes("authentifié")) {
        setLocation("/admin/login");
      }
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Not authenticated");
      
      await updateOrderStatus(orderId, newStatus, token);
      await fetchOrders();
      toast.success("Statut mis à jour");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour");
      toast.error(err.message || "Erreur lors de la mise à jour");
    } finally {
      setUpdating(null);
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    setAssigning(orderId);
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) throw new Error("Not authenticated");
      
      await assignOrderToDriver(orderId, driverId, token);
      await fetchOrders();
      setError("");
      toast.success("Livreur assigné");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'assignation");
      toast.error(err.message || "Erreur lors de l'assignation");
    } finally {
      setAssigning(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setLocation("/admin/login");
  };

  // MVP: Statuts simplifiés (preparing et baking supprimés)
  const statuses = ["pending", "accepted", "ready", "delivery", "delivered", "rejected"] as const;

  // Calculer les statistiques
  const totalOrders = orders.length;
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const readyCount = orders.filter(o => o.status === "ready").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simplifié */}
      <div className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-serif font-bold truncate">Espace Admin</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">Supervision générale</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={fetchAll} className="px-2 md:px-3">
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
                      <Settings className="w-5 h-5" />
                      Menu Admin
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
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Statistiques</p>
                        <p className="text-xs text-muted-foreground">Vue d'ensemble</p>
                      </div>
                    </Button>

                    {/* Gestion */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <p className="font-medium text-sm mb-2">Gestion</p>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 h-auto py-2"
                        onClick={() => {
                          setActiveTab("restaurants");
                          setShowMenu(false);
                        }}
                      >
                        <Store className="w-4 h-4" />
                        <span>Restaurants</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 h-auto py-2"
                        onClick={() => {
                          setActiveTab("drivers");
                          setShowMenu(false);
                        }}
                      >
                        <Bike className="w-4 h-4" />
                        <span>Livreurs</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 h-auto py-2"
                        onClick={() => {
                          setActiveTab("pizzas");
                          setShowMenu(false);
                        }}
                      >
                        <PizzaIcon className="w-4 h-4" />
                        <span>Produits</span>
                      </Button>
                    </div>

                    {/* Commandes */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => {
                        setActiveTab("orders");
                        setShowMenu(false);
                      }}
                    >
                      <div className="bg-green-100 p-2 rounded-lg">
                        <ShoppingCart className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Commandes</p>
                        <p className="text-xs text-muted-foreground">{totalOrders} commande{totalOrders > 1 ? 's' : ''}</p>
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
      
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {error && (
          <div className="mb-4 flex gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Contenu basé sur l'onglet actif */}
        <div className="space-y-4">
          {/* ORDERS TAB */}
          {activeTab === "orders" && (
            <div className="space-y-4">
            {loading ? (
              <Card className="p-12 text-center">
                <RefreshCw className="w-8 h-8 mx-auto text-muted-foreground mb-4 animate-spin" />
                <p className="text-muted-foreground">Chargement des commandes...</p>
              </Card>
            ) : orders.length === 0 ? (
              <Card className="p-12 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune commande</h3>
                <p className="text-muted-foreground">Les nouvelles commandes apparaîtront ici</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="p-0 hover:shadow-lg transition-shadow overflow-hidden">
                    {/* Header coloré */}
                    <div className={`${getCardHeaderColor(order.status)} p-3 sm:p-4 text-white`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
                            {getStatusLabel(order.status)}
                          </Badge>
                          <span className="text-xs sm:text-sm font-mono text-white/90">
                            #{order.id.slice(0, 8)}
                          </span>
                          {order.createdAt && (
                            <div className="flex items-center gap-1 text-xs text-white/80">
                              <Calendar className="w-3 h-3" />
                              <span className="hidden sm:inline">
                                {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="sm:hidden">
                                {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setShowOrderDetails(true);
                            }}
                            className="h-8 px-2 gap-1 bg-white/10 text-white border-white/30 hover:bg-white/20"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-xs hidden sm:inline">Détails</span>
                          </Button>
                          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          <span className="text-lg sm:text-2xl font-bold text-white">
                            {Number(order.totalPrice).toFixed(2)} TND
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Contenu de la carte */}
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                        {/* Informations principales */}
                        <div className="flex-1 space-y-3 sm:space-y-4">
                          {/* Informations client */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-4 h-4" />
                              <span className="font-medium">Client</span>
                            </div>
                            <p className="font-semibold text-lg">{order.customerName}</p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4" />
                              <span className="font-medium">Téléphone</span>
                            </div>
                            <p className="font-medium">{order.phone}</p>
                          </div>
                        </div>

                        {/* Adresse */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium">Adresse de livraison</span>
                          </div>
                          <p className="text-sm">{order.address}</p>
                          {order.addressDetails && (
                            <p className="text-sm text-muted-foreground">{order.addressDetails}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions et contrôles */}
                      <div className="lg:w-80 space-y-3 sm:space-y-4 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6">
                        {/* Assignation livreur */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Assigner un livreur</Label>
                          <Select
                            disabled={assigning === order.id}
                            onValueChange={(value) => handleAssignDriver(order.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sélectionner un livreur..." />
                            </SelectTrigger>
                            <SelectContent>
                              {drivers.length === 0 ? (
                                <div className="px-2 py-2 text-sm text-muted-foreground">
                                  Aucun livreur disponible
                                </div>
                              ) : (
                                drivers.map((driver) => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    <div className="flex items-center gap-2">
                                      <Bike className="w-4 h-4" />
                                      <span>{driver.name}</span>
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {driver.status}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {assigning === order.id && (
                            <p className="text-xs text-muted-foreground">Assignation en cours...</p>
                          )}
                        </div>

                        {/* Changement de statut */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Modifier le statut</Label>
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleStatusChange(order.id, value)}
                            disabled={updating === order.id}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {getStatusLabel(status)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {updating === order.id && (
                            <p className="text-xs text-muted-foreground">Mise à jour en cours...</p>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Footer avec actualisation */}
            {orders.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mise à jour automatique toutes les 5 secondes
                  </p>
                  <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Actualiser
                  </Button>
                </div>
              </Card>
            )}
            </div>
          )}

          {/* RESTAURANTS TAB */}
          {activeTab === "restaurants" && (
            <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2">
              <h2 className="text-xl font-bold">Restaurants</h2>
              <Dialog open={showRestaurantDialog} onOpenChange={setShowRestaurantDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau Restaurant
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Créer un restaurant</DialogTitle>
                    <DialogDescription>
                      Remplissez les informations pour créer un nouveau restaurant
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Nom *</Label>
                      <Input
                        value={restaurantForm.name}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                        placeholder="Nom du restaurant"
                      />
                    </div>
                    <div>
                      <Label>Téléphone *</Label>
                      <Input
                        type="tel"
                        value={restaurantForm.phone}
                        onChange={(e) => {
                          // Nettoyer le numéro (garder seulement les chiffres)
                          const cleaned = e.target.value.replace(/\D/g, '');
                          setRestaurantForm({ ...restaurantForm, phone: cleaned });
                        }}
                        placeholder="21345678"
                        maxLength={15}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Entrez uniquement les chiffres (ex: 21345678)
                      </p>
                    </div>
                    <div>
                      <Label>Adresse *</Label>
                      <Input
                        value={restaurantForm.address}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                        placeholder="Adresse complète"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={restaurantForm.description}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, description: e.target.value })}
                        placeholder="Description (optionnel)"
                      />
                    </div>
                    <div>
                      <Label>Image URL</Label>
                      <Input
                        value={restaurantForm.imageUrl}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, imageUrl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Catégories de produits *</Label>
                      <div className="space-y-2 mt-2 border rounded-md p-3">
                        {["pizza", "burger", "salade", "grill", "drink", "dessert"].map((cat) => (
                          <div key={cat} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`cat-${cat}`}
                              checked={restaurantForm.categories.includes(cat)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRestaurantForm({
                                    ...restaurantForm,
                                    categories: [...restaurantForm.categories, cat],
                                  });
                                } else {
                                  setRestaurantForm({
                                    ...restaurantForm,
                                    categories: restaurantForm.categories.filter((c) => c !== cat),
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label
                              htmlFor={`cat-${cat}`}
                              className="text-sm font-normal cursor-pointer capitalize"
                            >
                              {cat === "drink" ? "Boisson" : cat === "dessert" ? "Dessert" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {restaurantForm.categories.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Sélectionnez au moins une catégorie
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Horaires d'ouverture</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">De</Label>
                          <Input
                            type="time"
                            value={restaurantForm.openingHours ? restaurantForm.openingHours.split("|")[0]?.split("-")[0] || "" : ""}
                            onChange={(e) => {
                              const hoursPart = restaurantForm.openingHours.split("|")[0] || "";
                              const closeTime = hoursPart.split("-")[1] || "23:00";
                              const closedDay = restaurantForm.openingHours.split("|")[1] || "";
                              const newHours = `${e.target.value}-${closeTime}`;
                              setRestaurantForm({
                                ...restaurantForm,
                                openingHours: closedDay ? `${newHours}|${closedDay}` : newHours,
                              });
                            }}
                            placeholder="09:00"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">À</Label>
                          <Input
                            type="time"
                            value={restaurantForm.openingHours ? restaurantForm.openingHours.split("|")[0]?.split("-")[1] || "" : ""}
                            onChange={(e) => {
                              const hoursPart = restaurantForm.openingHours.split("|")[0] || "";
                              const openTime = hoursPart.split("-")[0] || "09:00";
                              const closedDay = restaurantForm.openingHours.split("|")[1] || "";
                              const newHours = `${openTime}-${e.target.value}`;
                              setRestaurantForm({
                                ...restaurantForm,
                                openingHours: closedDay ? `${newHours}|${closedDay}` : newHours,
                              });
                            }}
                            placeholder="23:00"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: HH:MM (ex: 09:00-23:00 ou 20:00-06:00 pour ouverture nocturne)
                      </p>
                    </div>
                    <div>
                      <Label>Jour de repos</Label>
                      <Select
                        value={restaurantForm.closedDay || "none"}
                        onValueChange={(value) => setRestaurantForm({ ...restaurantForm, closedDay: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Aucun (ouvert tous les jours)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun (ouvert tous les jours)</SelectItem>
                          <SelectItem value="Dimanche">Dimanche</SelectItem>
                          <SelectItem value="Lundi">Lundi</SelectItem>
                          <SelectItem value="Mardi">Mardi</SelectItem>
                          <SelectItem value="Mercredi">Mercredi</SelectItem>
                          <SelectItem value="Jeudi">Jeudi</SelectItem>
                          <SelectItem value="Vendredi">Vendredi</SelectItem>
                          <SelectItem value="Samedi">Samedi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Temps de livraison (minutes)</Label>
                        <Input
                          type="number"
                          value={restaurantForm.deliveryTime}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, deliveryTime: parseInt(e.target.value) || 30 })}
                          placeholder="30"
                          min="10"
                          max="120"
                        />
                      </div>
                      <div>
                        <Label>Commande minimum (DT)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={restaurantForm.minOrder}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, minOrder: e.target.value })}
                          placeholder="0.00"
                          min="0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Note (sur 5)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={restaurantForm.rating}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, rating: e.target.value })}
                        placeholder="4.5"
                        min="0"
                        max="5"
                      />
                    </div>
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Bouton cliqué, formulaire:", restaurantForm);
                        handleCreateRestaurant();
                      }} 
                      className="w-full"
                      type="button"
                    >
                      Créer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {restaurants.map((restaurant) => (
                <Card key={restaurant.id} className="p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-base sm:text-lg break-words flex-1">{restaurant.name}</h3>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      {/* Bouton toggle visibilité */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            console.log("[ADMIN] Toggle visibilité - Restaurant:", restaurant.name, "isOpen actuel:", restaurant.isOpen);
                            if (!token) {
                              toast.error("Non authentifié");
                              return;
                            }
                            const newIsOpen = !restaurant.isOpen;
                            console.log("[ADMIN] Nouvelle valeur isOpen:", newIsOpen);
                            console.log("[ADMIN] Appel API updateRestaurant avec:", { id: restaurant.id, isOpen: newIsOpen });
                            
                            const updated = await updateRestaurant(restaurant.id, { 
                              isOpen: newIsOpen 
                            }, token);
                            
                            console.log("[ADMIN] Restaurant mis à jour:", updated);
                            console.log("[ADMIN] isOpen retourné par l'API:", updated.isOpen);
                            
                            toast.success(newIsOpen ? "Restaurant affiché" : "Restaurant masqué");
                            
                            console.log("[ADMIN] Rechargement de la liste des restaurants...");
                            await fetchRestaurants();
                            console.log("[ADMIN] Liste des restaurants rechargée");
                          } catch (err: any) {
                            console.error("[ADMIN] Erreur lors du changement de visibilité:", err);
                            toast.error(err.message || "Erreur lors du changement");
                          }
                        }}
                        className={`h-8 w-8 p-0 ${
                          restaurant.isOpen 
                            ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                        title={restaurant.isOpen ? "Masquer le restaurant" : "Afficher le restaurant"}
                      >
                        {(() => {
                          const actuallyOpen = isRestaurantOpen(restaurant);
                          console.log(`[ADMIN] Rendu icône pour ${restaurant.name} - isOpen (toggle):`, restaurant.isOpen, "actuallyOpen (avec horaires):", actuallyOpen, "openingHours:", restaurant.openingHours);
                          return restaurant.isOpen ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          );
                        })()}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRestaurant(restaurant)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRestaurant(restaurant.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{restaurant.phone}</p>
                  <p className="text-sm mt-2">{restaurant.address}</p>
                  {(() => {
                    // Parser categories si c'est une chaîne JSON
                    let categoriesArray: string[] = [];
                    if (restaurant.categories) {
                      if (typeof restaurant.categories === 'string') {
                        try {
                          categoriesArray = JSON.parse(restaurant.categories);
                        } catch (e) {
                          // Si le parsing échoue, traiter comme un tableau d'un seul élément
                          categoriesArray = [restaurant.categories];
                        }
                      } else if (Array.isArray(restaurant.categories)) {
                        categoriesArray = restaurant.categories;
                      }
                    }
                    
                    return categoriesArray.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {categoriesArray.map((cat) => (
                          <span key={cat} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 capitalize">
                            {cat === "drink" ? "Boisson" : cat === "dessert" ? "Dessert" : cat}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded ${restaurant.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      Toggle: {restaurant.isOpen ? 'Activé' : 'Désactivé'}
                    </span>
                    {(() => {
                      const actuallyOpen = isRestaurantOpen(restaurant);
                      return (
                        <span className={`text-xs px-2 py-1 rounded ${actuallyOpen ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                          Statut réel: {actuallyOpen ? 'Ouvert' : 'Fermé'}
                        </span>
                      );
                    })()}
                    {restaurant.openingHours && (
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                        Horaires: {restaurant.openingHours.split('|')[0]}
                      </span>
                    )}
                  </div>
                </Card>
              ))}
              {restaurants.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  Aucun restaurant. Créez-en un pour commencer.
                </p>
              )}
            </div>
            
            {/* Dialog pour modifier un restaurant */}
            <Dialog open={showEditRestaurantDialog} onOpenChange={setShowEditRestaurantDialog}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Modifier le restaurant</DialogTitle>
                  <DialogDescription>
                    Modifiez les informations du restaurant
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Nom *</Label>
                    <Input
                      value={restaurantForm.name}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                      placeholder="Nom du restaurant"
                    />
                  </div>
                  <div>
                    <Label>Téléphone *</Label>
                    <Input
                      type="tel"
                      value={restaurantForm.phone}
                      onChange={(e) => {
                        // Nettoyer le numéro (garder seulement les chiffres)
                        const cleaned = e.target.value.replace(/\D/g, '');
                        setRestaurantForm({ ...restaurantForm, phone: cleaned });
                      }}
                      placeholder="21345678"
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Entrez uniquement les chiffres (ex: 21345678)
                    </p>
                  </div>
                  <div>
                    <Label>Adresse *</Label>
                    <Input
                      value={restaurantForm.address}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                      placeholder="Adresse complète"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={restaurantForm.description}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, description: e.target.value })}
                      placeholder="Description (optionnel)"
                    />
                  </div>
                  <div>
                    <Label>Image URL</Label>
                    <Input
                      value={restaurantForm.imageUrl}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, imageUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Catégories de produits *</Label>
                    <div className="space-y-2 mt-2 border rounded-md p-3">
                      {["pizza", "burger", "salade", "grill", "drink", "dessert"].map((cat) => (
                        <div key={cat} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`edit-cat-${cat}`}
                            checked={restaurantForm.categories.includes(cat)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRestaurantForm({
                                  ...restaurantForm,
                                  categories: [...restaurantForm.categories, cat],
                                });
                              } else {
                                setRestaurantForm({
                                  ...restaurantForm,
                                  categories: restaurantForm.categories.filter((c) => c !== cat),
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Label
                            htmlFor={`edit-cat-${cat}`}
                            className="text-sm font-normal cursor-pointer capitalize"
                          >
                            {cat === "drink" ? "Boisson" : cat === "dessert" ? "Dessert" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {restaurantForm.categories.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Sélectionnez au moins une catégorie
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Horaires d'ouverture</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">De</Label>
                        <Input
                          type="time"
                          value={(() => {
                            if (!restaurantForm.openingHours) return "";
                            const hoursPart = restaurantForm.openingHours.split("|")[0] || "";
                            const openTime = hoursPart.split("-")[0] || "";
                            console.log("[ADMIN] Modal Edit - Champ 'De' - openingHours:", restaurantForm.openingHours, "hoursPart:", hoursPart, "openTime:", openTime);
                            return openTime;
                          })()}
                          onChange={(e) => {
                            const hoursPart = restaurantForm.openingHours ? restaurantForm.openingHours.split("|")[0] || "" : "";
                            const closeTime = hoursPart.split("-")[1] || "23:00";
                            const closedDay = restaurantForm.closedDay && restaurantForm.closedDay !== "none" ? restaurantForm.closedDay : "";
                            const newHours = `${e.target.value}-${closeTime}`;
                            console.log("[ADMIN] Modal Edit - Changement heure ouverture:", e.target.value, "newHours:", newHours);
                            setRestaurantForm({
                              ...restaurantForm,
                              openingHours: closedDay ? `${newHours}|${closedDay}` : newHours,
                            });
                          }}
                          placeholder="09:00"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">À</Label>
                        <Input
                          type="time"
                          value={(() => {
                            if (!restaurantForm.openingHours) return "";
                            const hoursPart = restaurantForm.openingHours.split("|")[0] || "";
                            const closeTime = hoursPart.split("-")[1] || "";
                            console.log("[ADMIN] Modal Edit - Champ 'À' - openingHours:", restaurantForm.openingHours, "hoursPart:", hoursPart, "closeTime:", closeTime);
                            return closeTime;
                          })()}
                          onChange={(e) => {
                            const hoursPart = restaurantForm.openingHours ? restaurantForm.openingHours.split("|")[0] || "" : "";
                            const openTime = hoursPart.split("-")[0] || "09:00";
                            const closedDay = restaurantForm.closedDay && restaurantForm.closedDay !== "none" ? restaurantForm.closedDay : "";
                            const newHours = `${openTime}-${e.target.value}`;
                            console.log("[ADMIN] Modal Edit - Changement heure fermeture:", e.target.value, "newHours:", newHours);
                            setRestaurantForm({
                              ...restaurantForm,
                              openingHours: closedDay ? `${newHours}|${closedDay}` : newHours,
                            });
                          }}
                          placeholder="23:00"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: HH:MM (ex: 09:00-23:00 ou 20:00-06:00 pour ouverture nocturne)
                    </p>
                  </div>
                  <div>
                    <Label>Jour de repos</Label>
                    <Select
                      value={restaurantForm.closedDay || "none"}
                      onValueChange={(value) => {
                        const closedDay = value === "none" ? "" : value;
                        let openingHours = restaurantForm.openingHours.split("|")[0] || "";
                        setRestaurantForm({ 
                          ...restaurantForm, 
                          closedDay: closedDay,
                          openingHours: closedDay ? `${openingHours}|${closedDay}` : openingHours
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Aucun (ouvert tous les jours)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun (ouvert tous les jours)</SelectItem>
                        <SelectItem value="Dimanche">Dimanche</SelectItem>
                        <SelectItem value="Lundi">Lundi</SelectItem>
                        <SelectItem value="Mardi">Mardi</SelectItem>
                        <SelectItem value="Mercredi">Mercredi</SelectItem>
                        <SelectItem value="Jeudi">Jeudi</SelectItem>
                        <SelectItem value="Vendredi">Vendredi</SelectItem>
                        <SelectItem value="Samedi">Samedi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Temps de livraison (minutes)</Label>
                      <Input
                        type="number"
                        value={restaurantForm.deliveryTime}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, deliveryTime: parseInt(e.target.value) || 30 })}
                        placeholder="30"
                        min="10"
                        max="120"
                      />
                    </div>
                    <div>
                      <Label>Commande minimum (DT)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={restaurantForm.minOrder}
                        onChange={(e) => setRestaurantForm({ ...restaurantForm, minOrder: e.target.value })}
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Note (sur 5)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={restaurantForm.rating}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, rating: e.target.value })}
                      placeholder="4.5"
                      min="0"
                      max="5"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateRestaurant} className="flex-1">
                      Enregistrer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEditRestaurantDialog(false);
                        setEditingRestaurant(null);
                        setRestaurantForm({ 
                          name: "", 
                          phone: "", 
                          address: "", 
                          description: "", 
                          imageUrl: "", 
                          categories: [],
                          openingHours: "",
                          closedDay: "",
                          deliveryTime: 30,
                          minOrder: "0",
                          rating: "4.5"
                        });
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          )}

          {/* DRIVERS TAB */}
          {activeTab === "drivers" && (
            <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2">
              <h2 className="text-xl font-bold">Livreurs</h2>
              <Dialog open={showDriverDialog} onOpenChange={setShowDriverDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau Livreur
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un livreur</DialogTitle>
                    <DialogDescription>
                      Remplissez les informations pour créer un nouveau livreur
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Nom *</Label>
                      <Input
                        value={driverForm.name}
                        onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                        placeholder="Nom du livreur"
                      />
                    </div>
                    <div>
                      <Label>Téléphone *</Label>
                      <Input
                        value={driverForm.phone}
                        onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                        placeholder="21612345678"
                      />
                    </div>
                    <div>
                      <Label>Mot de passe *</Label>
                      <Input
                        type="password"
                        value={driverForm.password}
                        onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                        placeholder="Mot de passe (min 6 caractères)"
                      />
                    </div>
                    <Button onClick={handleCreateDriver} className="w-full">
                      Créer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {drivers.map((driver) => (
                <Card key={driver.id} className="p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-base sm:text-lg break-words flex-1">{driver.name}</h3>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDriver(driver)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDriver(driver.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{driver.phone}</p>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      driver.status === 'available' ? 'bg-green-100 text-green-800' :
                      driver.status === 'on_delivery' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {driver.status === 'available' ? 'Disponible' :
                       driver.status === 'on_delivery' ? 'En livraison' :
                       driver.status}
                    </span>
                  </div>
                </Card>
              ))}
              {drivers.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  Aucun livreur. Créez-en un pour commencer.
                </p>
              )}
            </div>
            
            {/* Dialog pour modifier un livreur */}
            <Dialog open={showEditDriverDialog} onOpenChange={setShowEditDriverDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifier le livreur</DialogTitle>
                  <DialogDescription>
                    Modifiez les informations du livreur. Laissez le mot de passe vide pour ne pas le modifier.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Nom *</Label>
                    <Input
                      value={driverForm.name}
                      onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                      placeholder="Nom du livreur"
                    />
                  </div>
                  <div>
                    <Label>Téléphone *</Label>
                    <Input
                      value={driverForm.phone}
                      onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                      placeholder="21612345678"
                    />
                  </div>
                  <div>
                    <Label>Nouveau mot de passe (optionnel)</Label>
                    <Input
                      type="password"
                      value={driverForm.password}
                      onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                      placeholder="Laissez vide pour ne pas modifier"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateDriver} className="flex-1">
                      Enregistrer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEditDriverDialog(false);
                        setEditingDriver(null);
                        setDriverForm({ name: "", phone: "", password: "" });
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          )}

          {/* PIZZAS TAB */}
          {activeTab === "pizzas" && (
            <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Produits</h2>
              <Dialog open={showPizzaDialog} onOpenChange={setShowPizzaDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau Produit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Créer un produit</DialogTitle>
                    <DialogDescription>
                      Remplissez les informations pour créer un nouveau produit (pizza, burger, salade, etc.)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Restaurant *</Label>
                      <Select
                        value={pizzaForm.restaurantId}
                        onValueChange={(value) => setPizzaForm({ ...pizzaForm, restaurantId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un restaurant" />
                        </SelectTrigger>
                        <SelectContent>
                          {restaurants.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Type de produit *</Label>
                      <Select
                        value={pizzaForm.productType}
                        onValueChange={(value) => setPizzaForm({ ...pizzaForm, productType: value, category: value === "pizza" ? "classic" : pizzaForm.category })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pizza">Pizza</SelectItem>
                          <SelectItem value="burger">Burger</SelectItem>
                          <SelectItem value="salade">Salade</SelectItem>
                          <SelectItem value="drink">Boisson</SelectItem>
                          <SelectItem value="dessert">Dessert</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nom *</Label>
                      <Input
                        value={pizzaForm.name}
                        onChange={(e) => setPizzaForm({ ...pizzaForm, name: e.target.value })}
                        placeholder="Nom du produit"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={pizzaForm.description}
                        onChange={(e) => setPizzaForm({ ...pizzaForm, description: e.target.value })}
                        placeholder="Description (optionnel)"
                      />
                    </div>
                    <div>
                      <Label>Catégorie *</Label>
                      {pizzaForm.productType === "pizza" ? (
                        <Select
                          value={pizzaForm.category}
                          onValueChange={(value) => setPizzaForm({ ...pizzaForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classic">Classique</SelectItem>
                            <SelectItem value="special">Spéciale</SelectItem>
                            <SelectItem value="vegetarian">Végétarienne</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : pizzaForm.productType === "burger" ? (
                        <Input
                          value={pizzaForm.category}
                          onChange={(e) => setPizzaForm({ ...pizzaForm, category: e.target.value })}
                          placeholder="Ex: beef, chicken, vegetarian"
                        />
                      ) : (
                        <Input
                          value={pizzaForm.category}
                          onChange={(e) => setPizzaForm({ ...pizzaForm, category: e.target.value })}
                          placeholder="Catégorie du produit"
                        />
                      )}
                    </div>
                    <div>
                      <Label>Image URL</Label>
                      <Input
                        value={pizzaForm.imageUrl}
                        onChange={(e) => setPizzaForm({ ...pizzaForm, imageUrl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Prixs</Label>
                      <div className="space-y-2">
                        {pizzaForm.prices.map((price, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <span className="w-20 text-sm">{price.size}:</span>
                            <Input
                              type="number"
                              value={price.price}
                              onChange={(e) => {
                                const newPrices = [...pizzaForm.prices];
                                newPrices[idx].price = parseFloat(e.target.value) || 0;
                                setPizzaForm({ ...pizzaForm, prices: newPrices });
                              }}
                              placeholder="Prix"
                            />
                            <span className="text-sm">TND</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreatePizza} className="w-full">
                      Créer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {pizzas.map((pizza) => {
                const restaurant = restaurants.find(r => r.id === pizza.restaurantId);
                return (
                  <Card key={pizza.id} className="p-4">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg break-words">{pizza.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {restaurant?.name || "Restaurant inconnu"}
                        </p>
                      </div>
                      <div className="flex gap-1 sm:gap-2 items-start flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded ${
                          pizza.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {pizza.available ? 'Disponible' : 'Indisponible'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPizza(pizza)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePizza(pizza.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {pizza.description && (
                      <p className="text-sm text-gray-600 mb-2">{pizza.description}</p>
                    )}
                    <div className="flex gap-2 mb-2">
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 capitalize">
                        {pizza.productType === "drink" ? "Boisson" : 
                         pizza.productType === "dessert" ? "Dessert" : 
                         pizza.productType}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 capitalize">
                        {pizza.category}
                      </span>
                    </div>
                    {pizza.prices && pizza.prices.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold mb-1">Prix:</p>
                        <div className="flex flex-wrap gap-2">
                          {pizza.prices.map((price: any, idx: number) => (
                            <span key={idx} className="text-xs">
                              {price.size}: <strong>{price.price} TND</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
              {pizzas.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  Aucun produit. Créez-en un pour commencer.
                </p>
              )}
            </div>
            
            {/* Dialog pour modifier un produit */}
            <Dialog open={showEditPizzaDialog} onOpenChange={setShowEditPizzaDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Modifier le produit</DialogTitle>
                  <DialogDescription>
                    Modifiez les informations du produit
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Restaurant *</Label>
                    <Select
                      value={pizzaForm.restaurantId}
                      onValueChange={(value) => setPizzaForm({ ...pizzaForm, restaurantId: value })}
                      disabled
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un restaurant" />
                      </SelectTrigger>
                      <SelectContent>
                        {restaurants.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Le restaurant ne peut pas être modifié
                    </p>
                  </div>
                  <div>
                    <Label>Type de produit *</Label>
                    <Select
                      value={pizzaForm.productType}
                      onValueChange={(value) => setPizzaForm({ ...pizzaForm, productType: value, category: value === "pizza" ? "classic" : pizzaForm.category })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pizza">Pizza</SelectItem>
                        <SelectItem value="burger">Burger</SelectItem>
                        <SelectItem value="salade">Salade</SelectItem>
                        <SelectItem value="drink">Boisson</SelectItem>
                        <SelectItem value="dessert">Dessert</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nom *</Label>
                    <Input
                      value={pizzaForm.name}
                      onChange={(e) => setPizzaForm({ ...pizzaForm, name: e.target.value })}
                      placeholder="Nom du produit"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={pizzaForm.description}
                      onChange={(e) => setPizzaForm({ ...pizzaForm, description: e.target.value })}
                      placeholder="Description (optionnel)"
                    />
                  </div>
                  <div>
                    <Label>Catégorie *</Label>
                    {pizzaForm.productType === "pizza" ? (
                      <Select
                        value={pizzaForm.category}
                        onValueChange={(value) => setPizzaForm({ ...pizzaForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classic">Classique</SelectItem>
                          <SelectItem value="special">Spéciale</SelectItem>
                          <SelectItem value="vegetarian">Végétarienne</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : pizzaForm.productType === "burger" ? (
                      <Input
                        value={pizzaForm.category}
                        onChange={(e) => setPizzaForm({ ...pizzaForm, category: e.target.value })}
                        placeholder="Ex: beef, chicken, vegetarian"
                      />
                    ) : (
                      <Input
                        value={pizzaForm.category}
                        onChange={(e) => setPizzaForm({ ...pizzaForm, category: e.target.value })}
                        placeholder="Catégorie du produit"
                      />
                    )}
                  </div>
                  <div>
                    <Label>Image URL</Label>
                    <Input
                      value={pizzaForm.imageUrl}
                      onChange={(e) => setPizzaForm({ ...pizzaForm, imageUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Disponibilité</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="edit-pizza-available"
                        checked={pizzaForm.available !== false}
                        onChange={(e) => setPizzaForm({ ...pizzaForm, available: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="edit-pizza-available" className="text-sm font-normal cursor-pointer">
                        Produit disponible
                      </Label>
                    </div>
                  </div>
                  <div>
                    <Label>Prixs</Label>
                    <div className="space-y-2">
                      {pizzaForm.prices.map((price, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <span className="w-20 text-sm">{price.size}:</span>
                          <Input
                            type="number"
                            value={price.price}
                            onChange={(e) => {
                              const newPrices = [...pizzaForm.prices];
                              newPrices[idx].price = parseFloat(e.target.value) || 0;
                              setPizzaForm({ ...pizzaForm, prices: newPrices });
                            }}
                            placeholder="Prix"
                          />
                          <span className="text-sm">TND</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdatePizza} className="flex-1">
                      Enregistrer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEditPizzaDialog(false);
                        setEditingPizza(null);
                        setPizzaForm({ restaurantId: "", name: "", description: "", productType: "pizza", category: "classic", imageUrl: "", available: true, prices: [{ size: "small", price: 10 }, { size: "medium", price: 15 }, { size: "large", price: 18 }] });
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Modal Statistiques */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Statistiques
            </DialogTitle>
            <DialogDescription>
              Vue d'ensemble des commandes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Stats détaillées */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 text-center border-l-4 border-l-blue-500">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
              </Card>
              <Card className="p-3 text-center border-l-4 border-l-yellow-500">
                <p className="text-xs text-muted-foreground mb-1">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </Card>
              <Card className="p-3 text-center border-l-4 border-l-green-500">
                <p className="text-xs text-muted-foreground mb-1">Prêtes</p>
                <p className="text-2xl font-bold text-green-600">{readyCount}</p>
              </Card>
              <Card className="p-3 text-center border-l-4 border-l-emerald-500">
                <p className="text-xs text-muted-foreground mb-1">Livrées</p>
                <p className="text-2xl font-bold text-emerald-600">{deliveredCount}</p>
              </Card>
            </div>

            {/* Détails */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Répartition</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Restaurants</span>
                  <span className="font-medium">{restaurants.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livreurs</span>
                  <span className="font-medium">{drivers.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Produits</span>
                  <span className="font-medium">{pizzas.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={showOrderDetails}
        onOpenChange={setShowOrderDetails}
        role="admin"
      />
    </div>
  );
}
