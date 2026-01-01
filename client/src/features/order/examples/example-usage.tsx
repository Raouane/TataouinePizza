/**
 * Exemple d'utilisation du feature Order V2
 * 
 * Ce fichier montre comment utiliser les nouveaux hooks et API
 * pour créer et gérer des commandes selon l'architecture V2
 */

import { useState } from "react";
import { useOrder, useCreateOrder, useCustomerOrders } from "../hooks/use-order";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Exemple 1 : Créer une commande
export function CreateOrderExample() {
  const createOrderMutation = useCreateOrder();

  const handleCreateOrder = async () => {
    try {
      const result = await createOrderMutation.mutateAsync({
        restaurantId: "resto-001",
        customerName: "John Doe",
        phone: "21612345678",
        address: "123 Main Street",
        addressDetails: "Appartement 4B",
        items: [
          {
            pizzaId: "pizza-001",
            size: "medium",
            quantity: 2
          }
        ],
        paymentMethod: "cash",
        notes: "Sans oignons"
      });

      console.log("Commande créée:", result.orderId);
      // Rediriger vers la page de succès
      window.location.href = `/success?orderId=${result.orderId}`;
    } catch (error: any) {
      console.error("Erreur création commande:", error);
      alert(error.message);
    }
  };

  return (
    <Button 
      onClick={handleCreateOrder}
      disabled={createOrderMutation.isPending}
    >
      {createOrderMutation.isPending ? "Création..." : "Créer commande"}
    </Button>
  );
}

// Exemple 2 : Afficher une commande
export function OrderDetailsExample({ orderId }: { orderId: string }) {
  const { data: order, isLoading, error } = useOrder(orderId);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  if (!order) return <div>Commande introuvable</div>;

  return (
    <Card className="p-4">
      <h2>Commande #{order.id.slice(0, 8)}</h2>
      <p>Statut: {order.status}</p>
      <p>Total: {order.totalPrice} TND</p>
      <p>Client: {order.customerName}</p>
      <p>Adresse: {order.address}</p>
      
      {/* Note: order.items n'est pas disponible directement, il faut utiliser getOrderWithItems */}
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Pour voir les items, utilisez OrderService.getOrderWithItems()
        </p>
      </div>
    </Card>
  );
}

// Exemple 3 : Liste des commandes d'un client
export function CustomerOrdersExample({ phone }: { phone: string }) {
  const { data: orders, isLoading } = useCustomerOrders(phone);

  if (isLoading) return <div>Chargement...</div>;
  if (!orders || orders.length === 0) return <div>Aucune commande</div>;

  return (
    <div className="space-y-4">
      <h2>Mes commandes ({orders.length})</h2>
      {orders.map((order) => (
        <Card key={order.id} className="p-4">
          <div className="flex justify-between">
            <div>
              <p className="font-bold">Commande #{order.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-600">{order.status}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{order.totalPrice} TND</p>
              <p className="text-sm text-gray-600">
                {new Date(order.createdAt || "").toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Exemple 4 : Utilisation complète avec gestion d'erreurs
export function CompleteOrderExample() {
  const createOrderMutation = useCreateOrder();
  const [orderId, setOrderId] = useState<string | null>(null);
  const { data: order } = useOrder(orderId);

  const handleSubmit = async (formData: any) => {
    try {
      const result = await createOrderMutation.mutateAsync(formData);
      setOrderId(result.orderId);
      
      // Gérer les doublons
      if (result.duplicate) {
        alert("Cette commande existe déjà");
      }
    } catch (error: any) {
      // Gérer les erreurs spécifiques
      if (error.message.includes("fermé")) {
        alert("Le restaurant est fermé");
      } else if (error.message.includes("not found")) {
        alert("Produit introuvable");
      } else {
        alert(`Erreur: ${error.message}`);
      }
    }
  };

  return (
    <div>
      {/* Formulaire de commande */}
      <form onSubmit={(e) => {
        e.preventDefault();
        // ... collecter les données du formulaire
        handleSubmit({ /* ... */ });
      }}>
        {/* ... champs du formulaire ... */}
      </form>

      {/* Afficher la commande créée */}
      {order && <OrderDetailsExample orderId={order.id} />}
    </div>
  );
}
