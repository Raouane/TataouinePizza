import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import { getOrdersByPhone } from "@/lib/api";
import { getOnboarding } from "@/pages/onboarding";
import type { Order } from "@/lib/api";
import { Clock, MapPin, Phone, RefreshCw, ArrowLeft, Download, Store } from "lucide-react";
import { getStatusColor, getStatusLabel } from "@/lib/order-status-helpers";

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t, language } = useLanguage();
  
  // Récupérer le téléphone depuis l'onboarding
  const onboardingData = getOnboarding();
  const phone = onboardingData?.phone || "";

  // Charger automatiquement les commandes au montage du composant
  useEffect(() => {
    if (phone && phone.length >= 8) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [phone]);

  const loadOrders = async () => {
    if (!phone || phone.length < 8) return;
    
    setLoading(true);
    try {
      const result = await getOrdersByPhone(phone);
      setOrders(result);
    } catch (error) {
      console.error("Erreur lors de la récupération des commandes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh orders every 5 seconds to update statuses
  useEffect(() => {
    if (!phone || phone.length < 8) return;

    const interval = setInterval(async () => {
      try {
        setRefreshing(true);
        const result = await getOrdersByPhone(phone);
        setOrders(result);
      } catch (error) {
        console.error("Failed to refresh orders:", error);
      } finally {
        setRefreshing(false);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [phone]);

  // Utiliser les helpers centralisés avec support i18n
  const getStatusLabelWithI18n = (status: string) => {
    return getStatusLabel(status, t);
  };

  // Afficher la facture dans un nouvel onglet
  const downloadInvoice = (orderId: string) => {
    const invoiceUrl = `/api/orders/${orderId}/invoice`;
    window.open(invoiceUrl, '_blank');
  };

  // Si pas de données d'onboarding, afficher un message
  if (!onboardingData || !phone || phone.length < 8) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">{t('history.title')}</h1>
            <p className="text-muted-foreground">{t('history.subtitle')}</p>
          </div>
        </div>

        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">{t('history.noOnboarding')}</p>
          <Link href="/onboarding">
            <Button>{t('history.completeOnboarding')}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">{t('history.title')}</h1>
            <p className="text-muted-foreground">{t('history.subtitle')}</p>
          </div>
        </div>
        {refreshing && (
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
        )}
      </div>

      {/* Info Card avec téléphone */}
      <Card className="p-4 border-blue-200 bg-blue-50">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">{t('history.phone')}</p>
            <p className="text-sm text-blue-700">{phone}</p>
          </div>
        </div>
      </Card>

      {/* Liste des commandes */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('history.loading')}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">{t('history.noOrders')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {orders.length} {t('history.ordersFound')}
          </p>
          {orders.map((order) => (
            <Card key={order.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-muted-foreground">
                    Commande {order.id.slice(0, 8)}
                  </p>
                  <p className="text-lg font-bold text-foreground">{order.customerName}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {getStatusLabelWithI18n(order.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{order.phone}</span>
                </div>
                <div className="text-right font-bold text-primary">
                  {Number(order.totalPrice).toFixed(2)} TND
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{order.address}</p>
                  {order.addressDetails && (
                    <p className="text-muted-foreground">{order.addressDetails}</p>
                  )}
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Articles:</p>
                  <ul className="text-sm space-y-1">
                    {order.items.map((item: any, idx: number) => (
                      <li key={idx} className="text-muted-foreground">
                        • Pizza {item.pizzaId} - {item.size} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }) : "Date indisponible"}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadInvoice(order.id)}
                  className="h-8 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Facture
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
