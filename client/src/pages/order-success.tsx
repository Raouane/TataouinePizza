import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Phone, MessageCircle, MapPin, Clock, ChefHat, Bike, AlertCircle, X } from "lucide-react";
import confetti from "canvas-confetti";
import { useLanguage } from "@/lib/i18n";
import { useOrder } from "@/lib/order-context";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { useOrderTracking } from "@/hooks/use-order-tracking";
import { verifyFlouciPayment, isFlouciCallback, getFlouciPaymentId } from "@/features/order/services/flouci-verification";

export default function OrderSuccess() {
  const { t, language } = useLanguage();
  const { orderId, orderData, status, eta, refreshOrderData, startOrder } = useOrder();
  const [, setLocation] = useLocation();
  const { clearCart } = useCart();
  const [isVerifyingFlouci, setIsVerifyingFlouci] = useState(false);
  const [flouciVerified, setFlouciVerified] = useState(false);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Utiliser le hook de tracking amélioré
  const {
    phase: searchPhase,
    isDelivered,
    driverName,
    orderCreatedAt,
    showTimeoutAlert,
    showTimeoutDialog,
    dismissTimeoutAlert,
    dismissTimeoutDialog,
  } = useOrderTracking(orderId);

  // Vérifier le paiement Flouci si on arrive depuis Flouci
  useEffect(() => {
    if (!isFlouciCallback() || flouciVerified || isVerifyingFlouci) {
      return;
    }

    const pendingOrder = sessionStorage.getItem('pendingFlouciOrder');
    const paymentId = getFlouciPaymentId();

    if (pendingOrder && paymentId) {
      handleFlouciVerification(paymentId);
    } else if (pendingOrder && !paymentId) {
      // Pas de payment_id trouvé, afficher un message d'erreur
      console.error('[OrderSuccess] ❌ Payment ID not found');
      toast.error(
        language === 'ar' 
          ? 'معرف الدفع غير موجود' 
          : language === 'en' 
          ? 'Payment ID not found' 
          : 'Identifiant de paiement introuvable'
      );
      setTimeout(() => {
        setLocation('/cart?payment=error');
      }, 2000);
    }
  }, [flouciVerified, isVerifyingFlouci, language, setLocation]);

  // Fonction pour vérifier et créer la commande Flouci (utilise le service)
  const handleFlouciVerification = async (paymentId: string) => {
    setIsVerifyingFlouci(true);
    
    const result = await verifyFlouciPayment({
      paymentId,
      language,
      onSuccess: (orderIds) => {
        // Vider le panier
        clearCart();
        
        // Démarrer le suivi de commande
        if (orderIds.length > 0 && orderIds[0]) {
          startOrder(orderIds[0]);
        } else {
          startOrder();
        }
        
        setFlouciVerified(true);
        
        toast.success(
          language === 'ar' 
            ? 'تم تأكيد الدفع وإنشاء الطلب بنجاح' 
            : language === 'en' 
            ? 'Payment confirmed and order created successfully' 
            : 'Paiement confirmé et commande créée avec succès'
        );
      },
      onError: (error) => {
        toast.error(error);
      },
    });

    setIsVerifyingFlouci(false);

    // Rediriger si nécessaire
    if (result.redirectTo) {
      setTimeout(() => {
        setLocation(result.redirectTo!);
      }, result.error ? 3000 : 2000);
    }
  };

  // Charger les données initiales si orderId existe mais orderData n'est pas encore disponible
  useEffect(() => {
    if (orderId && !orderData && !isDelivered && !isVerifyingFlouci) {
      console.log('[OrderSuccess] Chargement initial des données de commande');
      refreshOrderData();
    }
  }, [orderId, orderData, isDelivered, refreshOrderData, isVerifyingFlouci]);

  // Détecter quand la commande est livrée et afficher le message de succès
  useEffect(() => {
    if (isDelivered && !showSuccessMessage) {
      console.log('[OrderSuccess] ✅ Commande livrée détectée, affichage message de succès');
      setShowSuccessMessage(true);
    }
  }, [isDelivered, showSuccessMessage]);

  // Fonction pour annuler la commande
  const handleCancelOrder = async () => {
    if (!orderId) return;

    try {
      console.log('[OrderSuccess] 🚫 Annulation de la commande', orderId);
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'annulation');
      }

      toast.success('Commande annulée avec succès');
      handleReturnHome();
    } catch (error: any) {
      console.error('[OrderSuccess] ❌ Erreur annulation:', error);
      toast.error(error.message || 'Erreur lors de l\'annulation');
    }
  };

  // Fonction pour retourner à l'accueil
  const handleReturnHome = () => {
    console.log('[OrderSuccess] 🔄 Retour à l\'accueil');
    // Nettoyer le sessionStorage
    sessionStorage.removeItem('currentOrderId');
    if (orderId) {
      sessionStorage.removeItem(`orderFoundShown_${orderId}`);
    }
    sessionStorage.removeItem('orderConfettiShown');
    
    // Rediriger vers l'accueil
    window.location.replace('/');
  };

  // Confetti au chargement de la page de succès (seulement la première fois)
  useEffect(() => {
    if (searchPhase === 'success') {
      const confettiShown = sessionStorage.getItem('orderConfettiShown');
      if (confettiShown === 'true') {
        return; // Ne pas refaire les confettis
      }

      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const random = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          sessionStorage.setItem('orderConfettiShown', 'true');
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [searchPhase]);

  // Afficher la bannière PWA 5 secondes après le succès de la commande
  useEffect(() => {
    if (searchPhase === 'success') {
      // Vérifier si la bannière a déjà été affichée pour cette commande
      const bannerShown = sessionStorage.getItem(`pwaBannerShown_${orderId}`);
      if (bannerShown === 'true') {
        return; // Ne pas réafficher
      }

      // Attendre 5 secondes avant d'afficher la bannière
      const timer = setTimeout(() => {
        setShowPwaBanner(true);
        sessionStorage.setItem(`pwaBannerShown_${orderId}`, 'true');
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setShowPwaBanner(false);
    }
  }, [searchPhase, orderId]);

  // Afficher le message de succès si la commande est livrée
  if (showSuccessMessage && isDelivered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check className="h-12 w-12 text-green-600" />
          </motion.div>
          <h1 className="text-3xl font-serif font-bold mb-2 text-green-600">
            {t('order.delivered.title') || 'Commande livrée !'}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {t('order.delivered.message') || 'Merci pour votre commande'}
          </p>
          <Button
            onClick={handleReturnHome}
            size="lg"
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg"
          >
            {t('success.back') || 'Retour à l\'accueil'}
          </Button>
        </motion.div>
      </div>
    );
  }

  // Afficher un écran de chargement pendant la vérification Flouci
  if (isVerifyingFlouci) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Check className="h-12 w-12 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-serif font-bold mb-2">
            {language === 'ar' 
              ? 'جارٍ التحقق من الدفع...' 
              : language === 'en' 
              ? 'Verifying payment...' 
              : 'Vérification du paiement...'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'يرجى الانتظار بينما نتحقق من الدفع' 
              : language === 'en' 
              ? 'Please wait while we verify your payment' 
              : 'Veuillez patienter pendant que nous vérifions votre paiement'}
          </p>
        </motion.div>
      </div>
    );
  }

  // Phase de recherche de livreur
  if (searchPhase === 'searching') {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-24 w-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Bike className="h-12 w-12 text-orange-600" />
            </motion.div>
            <h1 className="text-2xl font-serif font-bold mb-2">{t('order.tracking.searching.title')}</h1>
            <p className="text-muted-foreground">{t('order.tracking.searching.desc')}</p>
            <div className="mt-8 flex gap-2 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 bg-orange-600 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Alerte à 5 minutes - gérée par le hook */}
        {showTimeoutAlert && (
          <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
            <Card className="p-4 border-orange-500 bg-orange-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-1">Aucun livreur disponible</h3>
                  <p className="text-sm text-orange-700 mb-3">
                    Nous n'avons pas trouvé de livreur disponible. Voulez-vous annuler votre commande ?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCancelOrder}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      Annuler la commande
                    </Button>
                    <Button
                      onClick={dismissTimeoutAlert}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Continuer à attendre
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={dismissTimeoutAlert}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Dialog d'annulation forcée à 10 minutes - géré par le hook */}
        <Dialog open={showTimeoutDialog} onOpenChange={dismissTimeoutDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Aucun livreur disponible
              </DialogTitle>
              <DialogDescription>
                Après 10 minutes d'attente, nous n'avons pas pu trouver de livreur disponible pour votre commande.
                Souhaitez-vous annuler votre commande ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={dismissTimeoutDialog}
                variant="outline"
              >
                Continuer à attendre
              </Button>
              <Button
                onClick={handleCancelOrder}
                variant="destructive"
              >
                Annuler la commande
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Phase "livreur trouvé" (transition rapide)
  if (searchPhase === 'found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-serif font-bold mb-2">{t('order.tracking.found.title')}</h1>
          <p className="text-muted-foreground">{t('order.tracking.found.desc')}</p>
        </motion.div>
      </div>
    );
  }

  // Page de succès avec design inspiré - utiliser les vraies données
  const orderNumber = orderData?.id ? `#JB-${orderData.id.slice(0, 8).toUpperCase()}` : orderId ? `#JB-${orderId.slice(0, 8).toUpperCase()}` : '#JB-XXXX';
  const estimatedTime = orderData?.estimatedDeliveryTime 
    ? `${orderData.estimatedDeliveryTime}-${orderData.estimatedDeliveryTime + 6} min`
    : eta > 0 ? `${eta}-${eta + 6} min` : '12-18 min';
  const deliveryAddress = orderData?.address || t('order.tracking.deliveryAddress.unavailable');
  const restaurantName = orderData?.restaurantName || t('order.tracking.restaurant.default');
  const totalPrice = orderData?.totalPrice ? parseFloat(orderData.totalPrice).toFixed(2) : '0.00';
  const itemsCount = orderData?.items?.length || 0;
  const realStatus = orderData?.status || 'pending';

  // Mapper le statut réel aux étapes
  const getStatusSteps = () => {
    return [
      { 
        id: 'received', 
        label: t('order.tracking.status.received'), 
        icon: Clock, 
        completed: realStatus !== 'pending',
        current: realStatus === 'pending',
        inProgress: realStatus === 'pending'
      },
      { 
        id: 'preparing', 
        label: t('order.tracking.status.preparing'), 
        icon: ChefHat, 
        completed: ['ready', 'delivery', 'delivered'].includes(realStatus),
        current: realStatus === 'accepted' || realStatus === 'ready',
        inProgress: realStatus === 'accepted' || realStatus === 'ready'
      },
      { 
        id: 'delivery', 
        label: t('order.tracking.status.delivery'), 
        icon: Bike, 
        completed: realStatus === 'delivered',
        current: realStatus === 'delivery',
        inProgress: false
      },
      { 
        id: 'delivered', 
        label: t('order.tracking.status.delivered'), 
        icon: Check, 
        completed: realStatus === 'delivered',
        current: false,
        inProgress: false
      },
    ];
  };

  const statusSteps = getStatusSteps();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            className="h-8 w-8"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-serif font-bold">{t('order.tracking.title')}</h1>
            <p className="text-sm text-muted-foreground">{orderNumber}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Carte de suivi */}
        <Card className="p-0 overflow-hidden">
          <div className="bg-gray-100 h-64 relative">
            {/* Carte simplifiée avec route */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full">
                {/* Route courbe */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
                  <path
                    d="M 50 200 Q 150 100, 250 150 T 350 100"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Position actuelle (avion) */}
                  <motion.g
                    initial={{ x: 50, y: 200 }}
                    animate={{ x: 250, y: 150 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <circle cx="0" cy="0" r="12" fill="white" stroke="#f97316" strokeWidth="3" />
                    <path
                      d="M -8 -8 L 0 0 L 8 -8"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </motion.g>
                  {/* Destination */}
                  <circle cx="350" cy="100" r="8" fill="#f97316" />
                  <circle cx="350" cy="100" r="4" fill="#22c55e" />
                </svg>
              </div>
            </div>
            {/* Adresse de livraison */}
            <div className="absolute bottom-4 left-4 right-4">
              <Card className="bg-white/95 backdrop-blur-sm p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">{t('order.tracking.deliveryAddress')}</p>
                    <p className="text-sm font-medium">{deliveryAddress}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Card>

        {/* Informations du livreur - seulement si assigné */}
        {orderData?.driverId && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {driverName ? driverName.split(' ').map(n => n[0]).join('') : t('order.tracking.driver.default')[0]}
                </div>
                <div>
                  <p className="font-semibold">{driverName || t('order.tracking.driver.default')}</p>
                  <p className="text-sm text-muted-foreground">{t('order.tracking.driver.title')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => window.location.href = `tel:${orderData?.driverPhone || orderData?.phone || ''}`}>
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => window.location.href = `sms:${orderData?.driverPhone || orderData?.phone || ''}`}>
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Temps estimé */}
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">{t('order.tracking.estimatedTime')}</p>
          <p className="text-3xl font-bold text-orange-600">{estimatedTime}</p>
        </Card>

        {/* Statut */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">{t('order.tracking.status.title')}</h3>
          <div className="space-y-4">
            {statusSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = step.completed;
              const isCurrent = step.current;
              const isInProgress = step.inProgress;

              return (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="relative flex flex-col items-center">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        isCompleted && "bg-green-600 text-white",
                        isCurrent && !isCompleted && "bg-orange-600 text-white",
                        !isCurrent && !isCompleted && "bg-gray-200 text-gray-400"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={cn(
                          "w-0.5 h-12 mt-2",
                          isCompleted ? "bg-green-600" : "bg-gray-200"
                        )}
                      />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <p
                      className={cn(
                        "font-medium",
                        isCurrent && "text-orange-600",
                        !isCurrent && !isCompleted && "text-gray-400"
                      )}
                    >
                      {step.label}
                    </p>
                    {isInProgress && (
                      <p className="text-sm text-orange-600 mt-1">{t('order.tracking.status.inProgress')}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Détails */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">{t('order.tracking.details.title')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('order.tracking.details.restaurant')}</span>
              <span className="font-medium">{restaurantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('order.tracking.details.items')}</span>
              <span className="font-medium">
                {itemsCount} {itemsCount !== 1 ? t('order.tracking.details.items.plural') : t('order.tracking.details.items.singular')}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">{t('order.tracking.details.total')}</span>
              <span className="font-bold text-lg">
                {totalPrice} €
              </span>
            </div>
          </div>
        </Card>

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-4">
          {orderData?.driverId && (
            <Button
              size="lg"
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              onClick={() => window.location.href = `tel:${orderData?.driverPhone || orderData?.phone || ''}`}
            >
              <Phone className="h-5 w-5 mr-2" />
              {t('order.tracking.callDriver')}
            </Button>
          )}
          <Link href="/">
            <Button size="lg" variant="outline" className={orderData?.driverId ? "px-6" : "flex-1"}>
              {t('order.tracking.back')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Bannière PWA - apparaît 5 secondes après le succès de la commande */}
      {showPwaBanner && searchPhase === 'success' && (
        <PwaInstallPrompt
          enableSound={false}
          showDelay={0}
          position="bottom"
        />
      )}
    </div>
  );
}
