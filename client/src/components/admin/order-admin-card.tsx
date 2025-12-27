import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Package, Eye, Download, Bike, User, Phone, MapPin } from "lucide-react";
import { getCardHeaderColor, getStatusLabel } from "@/lib/order-status-helpers";
import type { Order, Driver } from "@/lib/api";

interface OrderAdminCardProps {
  order: Order;
  drivers: Driver[];
  updating: string | null;
  assigning: string | null;
  statuses: readonly string[];
  onViewDetails: (orderId: string) => void;
  onAssignDriver: (orderId: string, driverId: string) => void;
  onChangeStatus: (orderId: string, newStatus: string) => void;
  onDownloadInvoice: (orderId: string) => void;
}

export function OrderAdminCard({
  order,
  drivers,
  updating,
  assigning,
  statuses,
  onViewDetails,
  onAssignDriver,
  onChangeStatus,
  onDownloadInvoice,
}: OrderAdminCardProps) {
  return (
    <Card className="p-0 hover:shadow-lg transition-shadow overflow-hidden">
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
              onClick={() => onViewDetails(order.id)}
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
                onValueChange={(value) => onAssignDriver(order.id, value)}
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

            {/* Bouton Facture */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onDownloadInvoice(order.id)}
              >
                <Download className="w-4 h-4 mr-2" />
                Facture
              </Button>
            </div>

            {/* Changement de statut */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Modifier le statut</Label>
              <Select
                value={order.status}
                onValueChange={(value) => onChangeStatus(order.id, value)}
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
  );
}

