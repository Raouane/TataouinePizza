import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import type { Order, Restaurant, Driver, Pizza } from "@/lib/api";

interface StatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  restaurants: Restaurant[];
  drivers: Driver[];
  pizzas: Pizza[];
}

export function StatsDialog({
  open,
  onOpenChange,
  orders,
  restaurants,
  drivers,
  pizzas,
}: StatsDialogProps) {
  const totalOrders = orders.length;
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const readyCount = orders.filter(o => o.status === "ready").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;
  
  // Commandes en attente de livreur (accepted ou ready sans driverId)
  const waitingForDriverCount = orders.filter(o => 
    (o.status === "accepted" || o.status === "ready") && !o.driverId
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            {waitingForDriverCount > 0 && (
              <Card className="p-3 text-center border-l-4 border-l-orange-500 col-span-2">
                <p className="text-xs text-muted-foreground mb-1">⚠️ En attente de livreur</p>
                <p className="text-2xl font-bold text-orange-600">{waitingForDriverCount}</p>
              </Card>
            )}
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
  );
}

