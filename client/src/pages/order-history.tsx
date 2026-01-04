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

/**
 * Helper pour obtenir le téléphone utilisateur
 * Fusionne les sources : onboarding (prioritaire) ou customerPhone (fallback)
 */
const getUserPhone = (): string => {
  const onboarding = getOnboarding();
  // Priorité 1 : Onboarding
  if (onboarding?.phone) {
    return onboarding.phone;
  }
  // Priorité 2 : CustomerPhone depuis le panier
  const customerPhone = localStorage.getItem('customerPhone');
  return customerPhone || "";
};

/**
 * Helper pour sauvegarder le téléphone (sans OTP)
 */
const savePhone = (phone: string): void => {
  localStorage.setItem('customerPhone', phone);
  // Optionnel : sauvegarder aussi dans onboarding si pas déjà présent
  const onboarding = getOnboarding();
  if (!onboarding?.phone) {
    const updatedOnboarding = { ...onboarding, phone } as any;
    localStorage.setItem('tp_onboarding', JSON.stringify(updatedOnboarding));
  }
};

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const { t, language } = useLanguage();
  
  // Récupérer le téléphone (onboarding ou customerPhone)
  const phone = getUserPhone();
  
  // Si pas de téléphone au montage, afficher le champ de saisie
  useEffect(() => {
    if (!phone || phone.length < 8) {
      setShowPhoneInput(true);
      setLoading(false);
    }
  }, [phone]);

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

  // Fonction pour charger les commandes avec un téléphone
  const handleLoadOrders = async (phoneToUse: string) => {
    if (!phoneToUse || phoneToUse.length < 8) {
      return;
    }
    
    // Normaliser le téléphone (supprimer espaces, ajouter + si nécessaire)
    const normalizedPhone = phoneToUse.replace(/\s+/g, "").replace(/^\+/, "");
    if (normalizedPhone.length < 8) {
      return;
    }
    
    // Sauvegarder le téléphone
    savePhone(normalizedPhone);
    setShowPhoneInput(false);
    setLoading(true);
    
    try {
      const result = await getOrdersByPhone(normalizedPhone);
      setOrders(result);
    } catch (error) {
      console.error("Erreur lors de la récupération des commandes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Si pas de téléphone valide, afficher un formulaire de saisie simple
  if (showPhoneInput || !phone || phone.length < 8) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => window.history.back()}
            aria-label={t('common.back') || "Retour"}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">{t('history.title')}</h1>
            <p className="text-muted-foreground">{t('history.subtitle')}</p>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Phone className="w-12 h-12 mx-auto mb-2 text-primary opacity-50" />
              <p className="text-muted-foreground mb-2">
                {language === 'ar' 
                  ? "أدخل رقم هاتفك لعرض طلباتك" 
                  : language === 'en' 
                  ? "Enter your phone number to view your orders"
                  : "Entrez votre numéro de téléphone pour voir vos commandes"}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone-input">
                {language === 'ar' ? "رقم الهاتف" : language === 'en' ? "Phone Number" : "Numéro de téléphone"}
              </Label>
              <Input
                id="phone-input"
                type="tel"
                placeholder={language === 'ar' ? "+216 XX XXX XXX" : language === 'en' ? "+216 XX XXX XXX" : "+216 XX XXX XXX"}
                value={phoneInput || phone || ""}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLoadOrders(phoneInput || phone || "");
                  }
                }}
                className="text-lg"
                autoFocus
              />
            </div>
            
            <Button 
              onClick={() => handleLoadOrders(phoneInput || phone || "")}
              className="w-full"
              disabled={!phoneInput && (!phone || phone.length < 8)}
            >
              <Search className="w-4 h-4 mr-2" />
              {language === 'ar' ? "عرض الطلبات" : language === 'en' ? "View Orders" : "Voir mes commandes"}
            </Button>
            
            <div className="text-center pt-4 border-t">
              <Link href="/cart">
                <Button variant="outline" size="sm">
                  {language === 'ar' ? "إجراء طلب جديد" : language === 'en' ? "Place a new order" : "Passer une commande"}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => window.history.back()}
            aria-label={t('common.back') || "Retour"}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
          {orders.map((order, index) => {
            // Vérifier si cette commande fait partie d'un groupe (même date/heure)
            const orderDate = order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : null;
            const previousOrder = index > 0 ? orders[index - 1] : null;
            const previousOrderDate = previousOrder?.createdAt ? new Date(previousOrder.createdAt).toISOString().split('T')[0] : null;
            const isPartOfGroup = index > 0 && 
              previousOrder?.createdAt && 
              order.createdAt &&
              previousOrderDate === orderDate &&
              Math.abs(new Date(order.createdAt).getTime() - new Date(previousOrder.createdAt).getTime()) < 60000; // Moins d'1 minute de différence
            
            return (
            <Card key={order.id} className={`p-4 space-y-3 ${isPartOfGroup ? 'border-l-4 border-l-orange-500' : ''}`}>
              {isPartOfGroup && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-2">
                  <p className="text-xs text-orange-800 font-medium">
                    ⚠️ {language === 'ar' ? 'جزء من طلب متعدد المطاعم' : language === 'en' ? 'Part of multi-restaurant order' : 'Partie d\'une commande multi-restaurants'}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-muted-foreground">
                    Commande {order.id.slice(0, 8)}
                  </p>
                  {order.restaurantName && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Store className="w-3 h-3 text-orange-500" />
                      <p className="text-xs text-muted-foreground">{order.restaurantName}</p>
                    </div>
                  )}
                  <p className="text-lg font-bold text-foreground mt-1">{order.customerName}</p>
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
          );
          })}
        </div>
      )}
    </div>
  );
}
