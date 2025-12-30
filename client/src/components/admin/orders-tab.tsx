import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShoppingCart, Phone } from "lucide-react";
import { OrderAdminCard } from "./order-admin-card";
import { CreateOrderDialog } from "./create-order-dialog";
import type { Order, Driver, Restaurant, Pizza } from "@/lib/api";

interface OrdersTabProps {
  orders: Order[];
  drivers: Driver[];
  restaurants: Restaurant[];
  pizzas: Pizza[];
  loading: boolean;
  updating: string | null;
  assigning: string | null;
  statuses: readonly string[];
  token: string;
  onViewDetails: (orderId: string) => void;
  onAssignDriver: (orderId: string, driverId: string) => void;
  onChangeStatus: (orderId: string, newStatus: string) => void;
  onDownloadInvoice: (orderId: string) => void;
  onRefresh: () => void;
}

export function OrdersTab({
  orders,
  drivers,
  restaurants,
  pizzas,
  loading,
  updating,
  assigning,
  statuses,
  token,
  onViewDetails,
  onAssignDriver,
  onChangeStatus,
  onDownloadInvoice,
  onRefresh,
}: OrdersTabProps) {
  const [showCreateOrderDialog, setShowCreateOrderDialog] = useState(false);

  return (
    <div className="space-y-4">
      {/* Bouton créer commande */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Commandes</h3>
            <p className="text-sm text-muted-foreground">
              Gérez les commandes ou créez-en une manuellement (appel téléphonique)
            </p>
          </div>
          <Button onClick={() => setShowCreateOrderDialog(true)}>
            <Phone className="w-4 h-4 mr-2" />
            Créer une commande
          </Button>
        </div>
      </Card>
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
            <OrderAdminCard
              key={order.id}
              order={order}
              drivers={drivers}
              updating={updating}
              assigning={assigning}
              statuses={statuses}
              onViewDetails={onViewDetails}
              onAssignDriver={onAssignDriver}
              onChangeStatus={onChangeStatus}
              onDownloadInvoice={onDownloadInvoice}
            />
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
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </Card>
      )}

      {/* Dialog créer commande */}
      <CreateOrderDialog
        open={showCreateOrderDialog}
        onOpenChange={setShowCreateOrderDialog}
        restaurants={restaurants}
        pizzas={pizzas}
        token={token}
        onSuccess={onRefresh}
      />
    </div>
  );
}

