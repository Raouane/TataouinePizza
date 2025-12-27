import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useOrdersPolling } from "@/hooks/use-orders-polling";
import { useOrders } from "@/hooks/use-orders";
import { useRestaurants } from "@/hooks/use-restaurants";
import { useDrivers } from "@/hooks/use-drivers";
import { usePizzas } from "@/hooks/use-pizzas";
import { adminError, adminLog } from "@/lib/admin-helpers";
import { toast } from "sonner";
import { OrderDetailsDialog } from "@/components/order-details-dialog";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatsDialog } from "@/components/admin/stats-dialog";
import { OrdersTab } from "@/components/admin/orders-tab";
import { RestaurantsTab } from "@/components/admin/restaurants-tab";
import { DriversTab } from "@/components/admin/drivers-tab";
import { PizzasTab } from "@/components/admin/pizzas-tab";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import type { Order, Driver, Restaurant, Pizza } from "@/lib/api";

const statuses = ["pending", "accepted", "ready", "delivery", "delivered", "rejected"] as const;

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { token, isAuthenticated } = useAdminAuth();
  
  // Data hooks
  const { orders, loading: ordersLoading, refetch: refetchOrders } = useOrdersPolling(token);
  const { restaurants, loading: restaurantsLoading, fetchRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants(token);
  const { drivers, loading: driversLoading, fetchDrivers, createDriver, updateDriver, deleteDriver } = useDrivers(token);
  const { pizzas, loading: pizzasLoading, restaurantsById, fetchPizzas, createPizza, updatePizza, deletePizza } = usePizzas(token, restaurants);
  const { updating, assigning, updateStatus, assignDriver } = useOrders(token);
  
  // UI State
  const [activeTab, setActiveTab] = useState("orders");
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  
  // Dialog states
  const [showRestaurantDialog, setShowRestaurantDialog] = useState(false);
  const [showEditRestaurantDialog, setShowEditRestaurantDialog] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [showDriverDialog, setShowDriverDialog] = useState(false);
  const [showEditDriverDialog, setShowEditDriverDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showPizzaDialog, setShowPizzaDialog] = useState(false);
  const [showEditPizzaDialog, setShowEditPizzaDialog] = useState(false);
  const [editingPizza, setEditingPizza] = useState<Pizza | null>(null);
  
  // Delete confirmation dialogs
  const [showDeleteRestaurantDialog, setShowDeleteRestaurantDialog] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [showDeleteDriverDialog, setShowDeleteDriverDialog] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [showDeletePizzaDialog, setShowDeletePizzaDialog] = useState(false);
  const [pizzaToDelete, setPizzaToDelete] = useState<Pizza | null>(null);

  // Loading states par tab
  const loading = ordersLoading || restaurantsLoading || driversLoading || pizzasLoading;

  // Initial fetch - optimisé avec Promise.all
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    
    const fetchAllData = async () => {
      await Promise.all([
        fetchRestaurants(),
        fetchDrivers(),
        fetchPizzas(),
      ]);
    };
    
    fetchAllData();
  }, [isAuthenticated, token, fetchRestaurants, fetchDrivers, fetchPizzas]);

  // Handlers - mémoïsés avec useCallback
  const fetchAll = useCallback(async () => {
    if (!token) return;
    await Promise.all([
      refetchOrders(),
      fetchRestaurants(),
      fetchDrivers(),
      fetchPizzas(),
    ]);
  }, [token, refetchOrders, fetchRestaurants, fetchDrivers, fetchPizzas]);

  const handleCreateRestaurant = useCallback(async (data: Partial<Restaurant>) => {
    if (!data.name || !data.phone || !data.address) {
      throw new Error("Les champs nom, téléphone et adresse sont requis");
    }
    await createRestaurant({
      name: data.name,
      phone: data.phone,
      address: data.address,
      description: data.description,
      imageUrl: data.imageUrl,
      categories: data.categories,
      openingHours: data.openingHours ?? undefined,
      deliveryTime: data.deliveryTime,
      minOrder: typeof data.minOrder === 'string' ? data.minOrder : data.minOrder?.toString(),
      rating: typeof data.rating === 'string' ? data.rating : data.rating?.toString(),
    });
    await fetchRestaurants();
  }, [createRestaurant, fetchRestaurants]);

  const handleUpdateRestaurant = useCallback(async (id: string, data: Partial<Restaurant>) => {
    await updateRestaurant(id, {
      ...data,
      openingHours: data.openingHours === null ? undefined : data.openingHours,
      minOrder: typeof data.minOrder === 'string' ? data.minOrder : data.minOrder?.toString(),
      rating: typeof data.rating === 'string' ? data.rating : data.rating?.toString(),
    });
    await fetchRestaurants();
  }, [updateRestaurant, fetchRestaurants]);

  const handleDeleteRestaurant = useCallback(async () => {
    if (!restaurantToDelete) return;
    try {
      await deleteRestaurant(restaurantToDelete.id);
      await fetchRestaurants();
      toast.success("Restaurant supprimé avec succès");
    } catch (err: any) {
      adminError("Erreur lors de la suppression du restaurant:", err);
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setRestaurantToDelete(null);
    }
  }, [restaurantToDelete, deleteRestaurant, fetchRestaurants]);

  const handleToggleRestaurantVisibility = useCallback(async (restaurantId: string, currentVisibility: boolean) => {
    try {
      const newIsOpen = !currentVisibility;
      adminLog("Toggle visibilité - Restaurant:", restaurantId, "nouvelle valeur:", newIsOpen);
      await updateRestaurant(restaurantId, { isOpen: newIsOpen });
      toast.success(newIsOpen ? "Restaurant affiché" : "Restaurant masqué");
      await fetchRestaurants();
    } catch (err: any) {
      adminError("Erreur lors du changement de visibilité:", err);
      toast.error(err.message || "Erreur lors du changement");
    }
  }, [updateRestaurant, fetchRestaurants]);

  const handleCreateDriver = useCallback(async (data: Partial<Driver>) => {
    if (!data.name || !data.phone || !(data as any).password) {
      throw new Error("Les champs nom, téléphone et mot de passe sont requis");
    }
    await createDriver({
      name: data.name,
      phone: data.phone,
      password: (data as any).password,
    });
    await fetchDrivers();
  }, [createDriver, fetchDrivers]);

  const handleUpdateDriver = useCallback(async (id: string, data: Partial<Driver>) => {
    await updateDriver(id, data);
    await fetchDrivers();
  }, [updateDriver, fetchDrivers]);

  const handleDeleteDriver = useCallback(async () => {
    if (!driverToDelete) return;
    try {
      await deleteDriver(driverToDelete.id);
      await fetchDrivers();
      toast.success("Livreur supprimé avec succès");
    } catch (err: any) {
      adminError("Erreur lors de la suppression du livreur:", err);
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setDriverToDelete(null);
    }
  }, [driverToDelete, deleteDriver, fetchDrivers]);

  const handleCreatePizza = useCallback(async (data: Partial<Pizza>) => {
    if (!data.restaurantId || !data.name || !data.category || !data.prices) {
      throw new Error("Les champs restaurant, nom, catégorie et prix sont requis");
    }
    await createPizza({
      restaurantId: data.restaurantId,
      name: data.name,
      description: data.description,
      productType: data.productType,
      category: data.category,
      imageUrl: data.imageUrl,
      available: data.available ?? true,
      prices: data.prices.map(p => ({ size: p.size, price: typeof p.price === 'string' ? parseFloat(p.price) : p.price })),
    });
    await fetchPizzas();
  }, [createPizza, fetchPizzas]);

  const handleUpdatePizza = useCallback(async (id: string, data: Partial<Pizza>) => {
    await updatePizza(id, {
      ...data,
      prices: data.prices ? data.prices.map(p => ({ size: p.size, price: typeof p.price === 'string' ? parseFloat(p.price) : p.price })) : undefined,
    });
    await fetchPizzas();
  }, [updatePizza, fetchPizzas]);

  const handleDeletePizza = useCallback(async () => {
    if (!pizzaToDelete) return;
    try {
      await deletePizza(pizzaToDelete.id);
      await fetchPizzas();
      toast.success("Produit supprimé avec succès");
    } catch (err: any) {
      adminError("Erreur lors de la suppression du produit:", err);
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setPizzaToDelete(null);
    }
  }, [pizzaToDelete, deletePizza, fetchPizzas]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    await updateStatus(orderId, newStatus, refetchOrders);
  }, [updateStatus, refetchOrders]);

  const handleAssignDriver = useCallback(async (orderId: string, driverId: string) => {
    await assignDriver(orderId, driverId, refetchOrders);
  }, [assignDriver, refetchOrders]);

  const downloadInvoice = useCallback((orderId: string) => {
    try {
      const invoiceUrl = `/api/orders/${orderId}/invoice`;
      // Utiliser un lien <a> avec download pour éviter les popups bloqués
      const link = document.createElement('a');
      link.href = invoiceUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      adminError('Erreur lors de l\'ouverture de la facture:', error);
      // Fallback: utiliser window.location
      window.location.href = `/api/orders/${orderId}/invoice`;
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("adminToken");
    setLocation("/admin/login");
  }, [setLocation]);

  // Handlers pour ouvrir les dialogs de suppression
  const openDeleteRestaurantDialog = useCallback((restaurant: Restaurant) => {
    setRestaurantToDelete(restaurant);
    setShowDeleteRestaurantDialog(true);
  }, []);

  const openDeleteDriverDialog = useCallback((driver: Driver) => {
    setDriverToDelete(driver);
    setShowDeleteDriverDialog(true);
  }, []);

  const openDeletePizzaDialog = useCallback((pizza: Pizza) => {
    setPizzaToDelete(pizza);
    setShowDeletePizzaDialog(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        activeTab={activeTab}
        totalOrders={orders.length}
        onRefresh={fetchAll}
        onSetActiveTab={setActiveTab}
        onShowStats={() => setShowStatsDialog(true)}
        onLogout={handleLogout}
        showMenu={showMenu}
        onSetShowMenu={setShowMenu}
      />
      
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {activeTab === "orders" && (
          <OrdersTab
            orders={orders}
            drivers={drivers}
            loading={ordersLoading}
            updating={updating}
            assigning={assigning}
            statuses={statuses}
            onViewDetails={(id) => {
              setSelectedOrderId(id);
              setShowOrderDetails(true);
            }}
            onAssignDriver={handleAssignDriver}
            onChangeStatus={handleStatusChange}
            onDownloadInvoice={downloadInvoice}
            onRefresh={refetchOrders}
          />
        )}
        
        {activeTab === "restaurants" && (
          <RestaurantsTab
            restaurants={restaurants}
            loading={restaurantsLoading}
            showCreateDialog={showRestaurantDialog}
            showEditDialog={showEditRestaurantDialog}
            editingRestaurant={editingRestaurant}
            onOpenCreateDialog={() => setShowRestaurantDialog(true)}
            onCloseCreateDialog={() => setShowRestaurantDialog(false)}
            onOpenEditDialog={(r) => {
              setEditingRestaurant(r);
              setShowEditRestaurantDialog(true);
            }}
            onCloseEditDialog={() => {
              setShowEditRestaurantDialog(false);
              setEditingRestaurant(null);
            }}
            onCreate={handleCreateRestaurant}
            onUpdate={handleUpdateRestaurant}
            onDelete={openDeleteRestaurantDialog}
            onToggleVisibility={handleToggleRestaurantVisibility}
          />
        )}
        
        {activeTab === "drivers" && (
          <DriversTab
            drivers={drivers}
            loading={driversLoading}
            showCreateDialog={showDriverDialog}
            showEditDialog={showEditDriverDialog}
            editingDriver={editingDriver}
            onOpenCreateDialog={() => setShowDriverDialog(true)}
            onCloseCreateDialog={() => setShowDriverDialog(false)}
            onOpenEditDialog={(d) => {
              setEditingDriver(d);
              setShowEditDriverDialog(true);
            }}
            onCloseEditDialog={() => {
              setShowEditDriverDialog(false);
              setEditingDriver(null);
            }}
            onCreate={handleCreateDriver}
            onUpdate={handleUpdateDriver}
            onDelete={openDeleteDriverDialog}
          />
        )}
        
        {activeTab === "pizzas" && (
          <PizzasTab
            pizzas={pizzas}
            restaurants={restaurants}
            restaurantsById={restaurantsById}
            loading={pizzasLoading}
            showCreateDialog={showPizzaDialog}
            showEditDialog={showEditPizzaDialog}
            editingPizza={editingPizza}
            onOpenCreateDialog={() => setShowPizzaDialog(true)}
            onCloseCreateDialog={() => setShowPizzaDialog(false)}
            onOpenEditDialog={(p) => {
              setEditingPizza(p);
              setShowEditPizzaDialog(true);
            }}
            onCloseEditDialog={() => {
              setShowEditPizzaDialog(false);
              setEditingPizza(null);
            }}
            onCreate={handleCreatePizza}
            onUpdate={handleUpdatePizza}
            onDelete={openDeletePizzaDialog}
          />
        )}
      </div>

      <StatsDialog
        open={showStatsDialog}
        onOpenChange={setShowStatsDialog}
        orders={orders}
        restaurants={restaurants}
        drivers={drivers}
        pizzas={pizzas}
      />

      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={showOrderDetails}
        onOpenChange={setShowOrderDetails}
        role="admin"
      />

      {/* Delete Confirmation Dialogs */}
      <DeleteConfirmDialog
        open={showDeleteRestaurantDialog}
        onOpenChange={setShowDeleteRestaurantDialog}
        title="Supprimer le restaurant"
        description="Êtes-vous sûr de vouloir supprimer ce restaurant ? Cette action est irréversible."
        itemName={restaurantToDelete?.name}
        onConfirm={handleDeleteRestaurant}
      />

      <DeleteConfirmDialog
        open={showDeleteDriverDialog}
        onOpenChange={setShowDeleteDriverDialog}
        title="Supprimer le livreur"
        description="Êtes-vous sûr de vouloir supprimer ce livreur ? Cette action est irréversible."
        itemName={driverToDelete?.name}
        onConfirm={handleDeleteDriver}
      />

      <DeleteConfirmDialog
        open={showDeletePizzaDialog}
        onOpenChange={setShowDeletePizzaDialog}
        title="Supprimer le produit"
        description="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
        itemName={pizzaToDelete?.name}
        onConfirm={handleDeletePizza}
      />
    </div>
  );
}
