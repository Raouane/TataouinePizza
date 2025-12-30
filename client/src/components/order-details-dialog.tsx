import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, MapPin, Store, User, Package, Banknote, Phone } from "lucide-react";
import { getOrder } from "@/lib/api";
import type { Order } from "@/lib/api";

interface OrderDetailsDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "restaurant" | "driver" | "admin";
}

export function OrderDetailsDialog({ orderId, open, onOpenChange, role }: OrderDetailsDialogProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails();
    } else {
      setOrder(null);
      setError(null);
    }
  }, [open, orderId]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    
    setLoading(true);
    setError(null);
    try {
      const orderData = await getOrder(orderId);
      setOrder(orderData);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des détails");
      console.error("Error fetching order details:", err);
    } finally {
      setLoading(false);
    }
  };

  const getSizeLabel = (size: string) => {
    const labels: Record<string, string> = {
      small: "Petite",
      medium: "Moyenne",
      large: "Grande",
    };
    return labels[size] || size;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la commande</DialogTitle>
          <DialogDescription>
            Commande #{orderId?.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchOrderDetails} className="mt-4" variant="outline">
              Réessayer
            </Button>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Restaurant View */}
            {role === "restaurant" && (
              <>
                {/* Client Info */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Client</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">{order.customerName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{order.phone}</span>
                    </div>
                  </div>
                </Card>

                {/* Plats */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Plats commandés</h3>
                  </div>
                  <div className="space-y-3">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => (
                        <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">
                              {item.pizza?.name || `Plat #${index + 1}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{getSizeLabel(item.size)}</Badge>
                              <span className="text-sm text-muted-foreground">
                                Quantité: {item.quantity}
                              </span>
                            </div>
                            {item.pricePerUnit && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {Number(item.pricePerUnit).toFixed(2)} TND × {item.quantity}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun plat trouvé</p>
                    )}
                  </div>
                </Card>

                {/* Montant */}
                <Card className="p-4 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Montant total</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {Number(order.totalPrice).toFixed(2)} TND
                    </span>
                  </div>
                </Card>
              </>
            )}

            {/* Driver View */}
            {role === "driver" && (
              <>
                {/* Restaurant Address */}
                <Card className="p-4 border-l-4 border-l-orange-500">
                  <div className="flex items-center gap-2 mb-3">
                    <Store className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold">Restaurant</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">{order.restaurantName || "Restaurant"}</p>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <span>{order.restaurantAddress || order.restaurantId || "Adresse non disponible"}</span>
                    </div>
                  </div>
                </Card>

                {/* Client Address */}
                <Card className="p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">Client</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">{order.customerName}</p>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p>{order.address}</p>
                        {order.addressDetails && (
                          <p className="text-muted-foreground mt-1">{order.addressDetails}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Phone className="w-4 h-4" />
                      <span>{order.phone}</span>
                    </div>
                  </div>
                </Card>

                {/* Plats */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Plats</h3>
                  </div>
                  <div className="space-y-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded">
                          <p className="text-sm">
                            {item.quantity}x {item.pizza?.name || `Plat #${index + 1}`} ({getSizeLabel(item.size)})
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun plat trouvé</p>
                    )}
                  </div>
                </Card>

                {/* Montant */}
                <Card className="p-4 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Montant total</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {Number(order.totalPrice).toFixed(2)} TND
                    </span>
                  </div>
                </Card>
              </>
            )}

            {/* Admin View */}
            {role === "admin" && (
              <>
                {/* Client Info */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Client</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">{order.customerName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{order.phone}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm mt-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p>{order.address}</p>
                        {order.addressDetails && (
                          <p className="text-muted-foreground mt-1">{order.addressDetails}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Restaurant Info */}
                {order.restaurantId && (
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Store className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Restaurant</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">{order.restaurantName || "Restaurant"}</p>
                      {order.restaurantAddress && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mt-0.5" />
                          <span>{order.restaurantAddress}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Plats */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Plats commandés</h3>
                  </div>
                  <div className="space-y-3">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => (
                        <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">
                              {item.pizza?.name || `Plat #${index + 1}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{getSizeLabel(item.size)}</Badge>
                              <span className="text-sm text-muted-foreground">
                                Quantité: {item.quantity}
                              </span>
                            </div>
                            {item.pricePerUnit && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {Number(item.pricePerUnit).toFixed(2)} TND × {item.quantity}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun plat trouvé</p>
                    )}
                  </div>
                </Card>

                {/* Montant */}
                <Card className="p-4 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Montant total</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {Number(order.totalPrice).toFixed(2)} TND
                    </span>
                  </div>
                </Card>

                {/* Notes / Commande spéciale */}
                {order.notes && (
                  <Card className={`p-4 ${order.notes.includes('COMMANDE SPÉCIALE') ? 'border-2 border-primary bg-primary/5' : ''}`}>
                    {order.notes.includes('COMMANDE SPÉCIALE') ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default" className="bg-primary">📋 Commande Spéciale</Badge>
                        </div>
                        <div className="space-y-2">
                          {order.notes.split('\n').map((line, idx) => {
                            if (line.includes('COMMANDE SPÉCIALE')) {
                              return (
                                <p key={idx} className="font-semibold text-primary">
                                  {line.replace('📋 COMMANDE SPÉCIALE (produits non listés):', '').trim()}
                                </p>
                              );
                            } else if (line.includes('Notes supplémentaires')) {
                              return (
                                <div key={idx} className="mt-3 pt-3 border-t">
                                  <p className="text-xs text-muted-foreground font-medium mb-1">{line}</p>
                                </div>
                              );
                            } else if (line.trim()) {
                              return <p key={idx} className="text-sm text-muted-foreground">{line}</p>;
                            }
                            return null;
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold mb-2">Notes</h3>
                        <p className="text-sm text-muted-foreground">{order.notes}</p>
                      </>
                    )}
                  </Card>
                )}
              </>
            )}
          </div>
        ) : null}

        <div className="flex justify-end mt-6">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

