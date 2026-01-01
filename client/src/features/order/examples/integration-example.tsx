/**
 * Exemple d'intégration du feature Order V2
 * 
 * Ce composant montre comment intégrer le feature Order V2
 * dans une page existante
 */

import { useState } from "react";
import { useOrder, useCreateOrder, useCustomerOrders } from "../hooks/use-order";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * Exemple : Formulaire de commande utilisant les hooks V2
 */
export function OrderFormExample() {
  const createOrderMutation = useCreateOrder();
  const [formData, setFormData] = useState({
    restaurantId: "",
    customerName: "",
    phone: "",
    address: "",
    items: [] as Array<{ pizzaId: string; size: "small" | "medium" | "large"; quantity: number }>
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createOrderMutation.mutateAsync({
        restaurantId: formData.restaurantId,
        customerName: formData.customerName,
        phone: formData.phone,
        address: formData.address,
        items: formData.items
      });

      toast.success(`Commande créée : ${result.orderId}`);
      
      // Rediriger vers la page de succès
      window.location.href = `/success?orderId=${result.orderId}`;
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création de la commande");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Restaurant ID</Label>
        <Input
          value={formData.restaurantId}
          onChange={(e) => setFormData({ ...formData, restaurantId: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label>Nom</Label>
        <Input
          value={formData.customerName}
          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label>Téléphone</Label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label>Adresse</Label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          required
        />
      </div>

      <Button 
        type="submit" 
        disabled={createOrderMutation.isPending}
        className="w-full"
      >
        {createOrderMutation.isPending ? "Création..." : "Créer la commande"}
      </Button>
    </form>
  );
}

/**
 * Exemple : Page de suivi de commande utilisant les hooks V2
 */
export function OrderTrackingExample({ orderId }: { orderId: string }) {
  const { data: order, isLoading, error, refetch } = useOrder(orderId);

  if (isLoading) {
    return <div className="p-4">Chargement de la commande...</div>;
  }

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-red-600">Erreur : {error.message}</p>
        <Button onClick={() => refetch()} className="mt-2">
          Réessayer
        </Button>
      </Card>
    );
  }

  if (!order) {
    return <div className="p-4">Commande introuvable</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold">Commande #{order.id.slice(0, 8)}</h2>
          <p className="text-sm text-gray-600">Statut : {order.status}</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Actualiser
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Client :</span>
          <span className="font-medium">{order.customerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Téléphone :</span>
          <span className="font-medium">{order.phone}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Adresse :</span>
          <span className="font-medium">{order.address}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total :</span>
          <span className="font-bold text-lg">{order.totalPrice} TND</span>
        </div>
      </div>

      {/* Note: order.items n'est pas disponible directement, il faut utiliser getOrderWithItems */}
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Pour voir les items, utilisez OrderService.getOrderWithItems()
        </p>
      </div>
    </Card>
  );
}

/**
 * Exemple : Liste des commandes d'un client
 */
export function CustomerOrdersListExample({ phone }: { phone: string }) {
  const { data: orders, isLoading, error } = useCustomerOrders(phone);

  if (isLoading) {
    return <div className="p-4">Chargement des commandes...</div>;
  }

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-red-600">Erreur : {error.message}</p>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-gray-600">Aucune commande trouvée</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mes commandes ({orders.length})</h2>
      {orders.map((order: any) => (
        <Card key={order.id} className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold">Commande #{order.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-600">{order.status}</p>
              <p className="text-sm text-gray-600">
                {new Date(order.createdAt || "").toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{order.totalPrice} TND</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `/success?orderId=${order.id}`}
              >
                Voir détails
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
