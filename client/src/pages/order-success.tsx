import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Phone, MessageCircle, MapPin, Clock, ChefHat, Package, Bike, User } from "lucide-react";
import confetti from "canvas-confetti";
import { useLanguage } from "@/lib/i18n";
import { useOrder } from "@/lib/order-context";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type SearchPhase = 'searching' | 'found' | 'success';

export default function OrderSuccess() {
  const { t } = useLanguage();
  const { activeOrder, orderId, orderData, status, eta, refreshOrderData } = useOrder();
  const [, setLocation] = useLocation();
  const [searchPhase, setSearchPhase] = useState<SearchPhase>('searching');
  const [driverName, setDriverName] = useState<string>('');
  const [hasShownSearch, setHasShownSearch] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  // Charger les données de la commande
  useEffect(() => {
    const loadOrderData = async () => {
      if (orderData) {
        setCurrentOrder(orderData);
        // Récupérer le nom du livreur si disponible
        if (orderData.driverName) {
          setDriverName(orderData.driverName);
        }
      } else if (orderId) {
        try {
          const response = await fetch(`/api/orders/${orderId}`);
          if (response.ok) {
            const data = await response.json();
            setCurrentOrder(data);
            // Récupérer le nom du livreur si disponible
            if (data.driverName) {
              setDriverName(data.driverName);
            }
          }
        } catch (error) {
          console.error('[OrderSuccess] Erreur lors du chargement de la commande:', error);
        }
      }
    };
    loadOrderData();
    
    // Rafraîchir les données toutes les 5 secondes
    const interval = setInterval(() => {
      if (orderId) {
        refreshOrderData();
        loadOrderData();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [orderId, orderData, refreshOrderData]);

  // Vérifier si on a déjà affiché la recherche de livreur (dans sessionStorage)
  useEffect(() => {
    const alreadySearched = sessionStorage.getItem('orderSearchShown');
    if (alreadySearched === 'true') {
      // Si déjà fait, passer directement à la page de succès
      setSearchPhase('success');
      setHasShownSearch(true);
    } else {
      // Première fois : simuler la recherche de livreur pendant 3-5 secondes
      const searchTimer = setTimeout(() => {
        setSearchPhase('found');
        sessionStorage.setItem('orderSearchShown', 'true');
        // Après 2 secondes, passer à la page de succès
        setTimeout(() => {
          setSearchPhase('success');
        }, 2000);
      }, 3000 + Math.random() * 2000); // Entre 3 et 5 secondes

      return () => clearTimeout(searchTimer);
    }
  }, []);

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

  // Phase de recherche de livreur
  if (searchPhase === 'searching') {
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
            className="h-24 w-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Bike className="h-12 w-12 text-orange-600" />
          </motion.div>
          <h1 className="text-2xl font-serif font-bold mb-2">Recherche de livreur autour...</h1>
          <p className="text-muted-foreground">Nous cherchons un livreur disponible près de vous</p>
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
          <h1 className="text-2xl font-serif font-bold mb-2">Livreur trouvé !</h1>
          <p className="text-muted-foreground">Préparation de votre commande...</p>
        </motion.div>
      </div>
    );
  }

  // Page de succès avec design inspiré - utiliser les vraies données
  const orderNumber = currentOrder?.id ? `#JB-${currentOrder.id.slice(0, 8).toUpperCase()}` : orderId ? `#JB-${orderId.slice(0, 8).toUpperCase()}` : '#JB-XXXX';
  const estimatedTime = currentOrder?.estimatedDeliveryTime 
    ? `${currentOrder.estimatedDeliveryTime}-${currentOrder.estimatedDeliveryTime + 6} min`
    : eta > 0 ? `${eta}-${eta + 6} min` : '12-18 min';
  const deliveryAddress = currentOrder?.address || 'Adresse non disponible';
  const restaurantName = currentOrder?.restaurantName || 'Restaurant';
  const totalPrice = currentOrder?.totalPrice ? parseFloat(currentOrder.totalPrice).toFixed(2) : '0.00';
  const itemsCount = currentOrder?.items?.length || 0;
  const realStatus = currentOrder?.status || 'pending';

  // Mapper le statut réel aux étapes
  const getStatusSteps = () => {
    return [
      { 
        id: 'received', 
        label: 'Commande reçue', 
        icon: Clock, 
        completed: realStatus !== 'pending',
        current: realStatus === 'pending',
        inProgress: realStatus === 'pending'
      },
      { 
        id: 'preparing', 
        label: 'En préparation', 
        icon: ChefHat, 
        completed: ['ready', 'delivery', 'delivered'].includes(realStatus),
        current: realStatus === 'accepted' || realStatus === 'ready',
        inProgress: realStatus === 'accepted' || realStatus === 'ready'
      },
      { 
        id: 'delivery', 
        label: 'En livraison', 
        icon: Bike, 
        completed: realStatus === 'delivered',
        current: realStatus === 'delivery',
        inProgress: false
      },
      { 
        id: 'delivered', 
        label: 'Livrée', 
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
            <h1 className="text-xl font-serif font-bold">Suivi de commande</h1>
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
                    <p className="text-xs text-muted-foreground mb-1">Adresse de livraison</p>
                    <p className="text-sm font-medium">{deliveryAddress}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Card>

        {/* Informations du livreur - seulement si assigné */}
        {currentOrder?.driverId && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {driverName ? driverName.split(' ').map(n => n[0]).join('') : 'L'}
                </div>
                <div>
                  <p className="font-semibold">{driverName || 'Livreur'}</p>
                  <p className="text-sm text-muted-foreground">Votre livreur</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => window.location.href = `tel:${currentOrder?.driverPhone || currentOrder?.phone || ''}`}>
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => window.location.href = `sms:${currentOrder?.driverPhone || currentOrder?.phone || ''}`}>
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Temps estimé */}
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Temps estimé</p>
          <p className="text-3xl font-bold text-orange-600">{estimatedTime}</p>
        </Card>

        {/* Statut */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Statut</h3>
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
                      <p className="text-sm text-orange-600 mt-1">En cours...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Détails */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Détails</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restaurant</span>
              <span className="font-medium">{restaurantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Articles</span>
              <span className="font-medium">
                {itemsCount} article{itemsCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">
                {totalPrice} €
              </span>
            </div>
          </div>
        </Card>

        {/* Boutons d'action */}
        <div className="flex gap-3 pt-4">
          {currentOrder?.driverId && (
            <Button
              size="lg"
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              onClick={() => window.location.href = `tel:${currentOrder?.driverPhone || currentOrder?.phone || ''}`}
            >
              <Phone className="h-5 w-5 mr-2" />
              Appeler le livreur
            </Button>
          )}
          <Link href="/">
            <Button size="lg" variant="outline" className={currentOrder?.driverId ? "px-6" : "flex-1"}>
              Retour
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
