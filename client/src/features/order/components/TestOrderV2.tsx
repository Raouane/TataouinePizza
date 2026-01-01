/**
 * Composant de test pour l'architecture V2 - Feature Order
 * 
 * Ce composant démontre l'utilisation des hooks V2
 * et peut être utilisé pour tester l'intégration
 */

import { useState } from "react";
import { useOrder, useCreateOrder, useCustomerOrders } from "../hooks/use-order";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Test 1 : Création de commande avec hook V2
 */
export function TestCreateOrder() {
  const createOrderMutation = useCreateOrder();
  const [formData, setFormData] = useState({
    restaurantId: "8db7da74-589f-43fa-891d-ca2408943b54", // BAB EL HARA
    customerName: "Test User V2",
    phone: "21699999999",
    address: "123 Test Street, Tataouine",
    pizzaId: "d19a505a-d126-4ec1-a4ee-f2b993362568", // Pizza Margherita
    size: "small" as "small" | "medium" | "large",
    quantity: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createOrderMutation.mutateAsync({
        restaurantId: formData.restaurantId,
        customerName: formData.customerName,
        phone: formData.phone,
        address: formData.address,
        items: [{
          pizzaId: formData.pizzaId,
          size: formData.size,
          quantity: formData.quantity
        }]
      });

      alert(`✅ Commande créée : ${result.orderId}\nTotal : ${result.totalPrice} TND`);
    } catch (error: any) {
      alert(`❌ Erreur : ${error.message}`);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Test : Création de commande V2</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <div>
          <Label>Taille</Label>
          <select
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value as "small" | "medium" | "large" })}
            className="w-full p-2 border rounded"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        <div>
          <Label>Quantité</Label>
          <Input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            required
          />
        </div>
        <Button 
          type="submit" 
          disabled={createOrderMutation.isPending}
          className="w-full"
        >
          {createOrderMutation.isPending ? "Création..." : "Créer la commande (V2)"}
        </Button>
        {createOrderMutation.isError && (
          <p className="text-red-600 text-sm">
            Erreur : {createOrderMutation.error?.message}
          </p>
        )}
      </form>
    </Card>
  );
}

/**
 * Test 2 : Récupération de commande avec hook V2
 */
export function TestGetOrder({ orderId }: { orderId: string }) {
  const { data: order, isLoading, error, refetch } = useOrder(orderId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <p>Chargement de la commande...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-600">Erreur : {error.message}</p>
        <Button onClick={() => refetch()} className="mt-2">
          Réessayer
        </Button>
      </Card>
    );
  }

  if (!order) {
    return (
      <Card className="p-6">
        <p>Commande introuvable</p>
      </Card>
    );
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
    </Card>
  );
}

/**
 * Test 3 : Liste des commandes d'un client
 */
export function TestCustomerOrders({ phone }: { phone: string }) {
  const { data: orders, isLoading, error, refetch } = useCustomerOrders(phone);

  if (isLoading) {
    return (
      <Card className="p-6">
        <p>Chargement des commandes...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-600">Erreur : {error.message}</p>
        <Button onClick={() => refetch()} className="mt-2">
          Réessayer
        </Button>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-gray-600">Aucune commande trouvée</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Mes commandes ({orders.length})</h2>
        <Button onClick={() => refetch()} variant="outline">
          Actualiser
        </Button>
      </div>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border p-4 rounded">
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Composant de test complet
 */
export function TestOrderV2Complete() {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedPhone, setSelectedPhone] = useState<string>("21699999999");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Tests Architecture V2 - Feature Order</h1>

      {/* Test 1 : Création */}
      <TestCreateOrder />

      {/* Test 2 : Récupération */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Test : Récupération de commande</h2>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Order ID"
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="flex-1"
          />
        </div>
        {selectedOrderId && <TestGetOrder orderId={selectedOrderId} />}
      </Card>

      {/* Test 3 : Commandes client */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Test : Commandes d'un client</h2>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Téléphone"
            value={selectedPhone}
            onChange={(e) => setSelectedPhone(e.target.value)}
            className="flex-1"
          />
        </div>
        {selectedPhone && <TestCustomerOrders phone={selectedPhone} />}
      </Card>
    </div>
  );
}
