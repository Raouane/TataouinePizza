import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bike, LogOut, Phone, MapPin, Check, RefreshCw, AlertCircle, ArrowLeft, Package, Clock, Store, Banknote, Navigation, Power, ExternalLink, User, Menu, BarChart3, Bell, Settings, Eye, History } from "lucide-react";
import { SwipeButton } from "@/components/swipe-button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getStatusColor, getDriverStatusLabel } from "@/lib/order-status-helpers";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OrderDetailsDialog } from "@/components/order-details-dialog";
import { AudioPermissionBanner } from "@/components/audio-permission-banner";
import { playOrderNotificationSound } from "@/lib/sound-utils";

interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetails?: string;
  customerLat?: string | number;
  customerLng?: string | number;
  status: string;
  totalPrice: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  driverId?: string;
  createdAt?: string;
}

const DRIVER_COMMISSION_RATE = 0.15; // 15% commission

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [isOnline, setIsOnline] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0); // Utiliser une ref pour éviter les re-renders
  
  // États pour la visibilité cyclique des commandes
  const [visibleOrderIds, setVisibleOrderIds] = useState<Set<string>>(new Set());
  const orderTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const availableOrdersRef = useRef<Order[]>([]); // Ref pour éviter les boucles infinies
  const soundIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map()); // Intervalles de son par commande
  
  // Durées configurables
  const ORDER_VISIBLE_DURATION = 30000; // 30 secondes - temps d'affichage
  const ORDER_HIDDEN_DURATION = 10000; // 10 secondes - temps de masquage
  const SOUND_REPEAT_INTERVAL = 5000; // 5 secondes - intervalle entre chaque répétition du son
  
  const driverName = localStorage.getItem("driverName") || "Livreur";
  const driverId = localStorage.getItem("driverId");
  const token = localStorage.getItem("driverToken");

    // WebSocket connection
  useEffect(() => {
    if (!token || !driverId || !isOnline) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?driverId=${driverId}&token=${token}`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[WebSocket] Connecté");
          setWsConnected(true);
          reconnectAttemptsRef.current = 0; // Réinitialiser les tentatives
          toast.success("Connecté aux notifications en temps réel");
        };

        ws.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("[WebSocket] Message reçu:", message);

            if (message.type === "connected") {
              console.log("[WebSocket]", message.message);
            } else if (message.type === "new_order") {
              // Nouvelle commande disponible
              setLastNotification(message);
              
              // Le son sera joué dans showOrder(), pas besoin de le jouer ici
              
              toast.info(`Nouvelle commande disponible: ${message.restaurantName}`, {
                duration: 10000,
                action: {
                  label: "Voir",
                  onClick: () => {
                    fetchOrders(); // Rafraîchir la liste
                  }
                }
              });
              
              // Ajouter la nouvelle commande et l'afficher
              setAvailableOrders(prev => {
                const exists = prev.some(o => o.id === message.orderId);
                if (!exists) {
                  const newOrder = message as any;
                  // Ajouter immédiatement à visibleOrderIds
                  setVisibleOrderIds(prevIds => {
                    const newSet = new Set(prevIds);
                    newSet.add(message.orderId);
                    return newSet;
                  });
                  // Démarrer le timer pour masquer après 30 secondes
                  // Le son sera joué dans showOrder()
                  setTimeout(() => {
                    showOrder(message.orderId, true); // true = jouer le son
                  }, 100);
                  return [...prev, newOrder];
                }
                return prev;
              });
              
              // Rafraîchir automatiquement la liste des commandes
              fetchOrders();
            } else if (message.type === "order_accepted") {
              toast.success(message.message || "Commande acceptée avec succès");
              // Masquer définitivement la commande acceptée
              hideOrderPermanently(message.orderId);
              // Mettre à jour immédiatement l'état local
              setAvailableOrders(prev => prev.filter(o => o.id !== message.orderId));
              setUpdating(null);
              // Mettre à jour le statut directement à "delivery" (en route)
              try {
                const updateRes = await fetch(`/api/driver/orders/${message.orderId}/status`, {
                  method: "PATCH",
                  headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}` 
                  },
                  body: JSON.stringify({ status: "delivery" }),
                });
                if (updateRes.ok) {
                  toast.info("En route vers le client!");
                }
              } catch (updateError) {
                console.error("[WebSocket] Erreur mise à jour statut:", updateError);
              }
              // Rafraîchir pour obtenir les détails complets
              fetchOrders();
            } else if (message.type === "order_rejected" || message.type === "order_already_taken") {
              toast.error(message.message || "Commande déjà prise");
              // Masquer la commande qui a été prise par un autre livreur
              hideOrderPermanently(message.orderId);
              setUpdating(null);
              fetchOrders();
            } else if (message.type === "error") {
              toast.error(message.message || "Erreur");
              setUpdating(null);
              fetchOrders();
            } else if (message.type === "pong") {
              // Heartbeat response
              console.log("[WebSocket] Heartbeat reçu");
            }
          } catch (error) {
            console.error("[WebSocket] Erreur parsing message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("[WebSocket] Erreur:", error);
          setWsConnected(false);
        };

        ws.onclose = () => {
          console.log("[WebSocket] Déconnecté");
          setWsConnected(false);
          
          // Tentative de reconnexion si toujours en ligne
          if (isOnline && reconnectAttemptsRef.current < 5) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            console.log(`[WebSocket] Reconnexion dans ${delay}ms... (tentative ${reconnectAttemptsRef.current + 1}/5)`);
            reconnectTimeout = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connect();
            }, delay);
          } else if (reconnectAttemptsRef.current >= 5) {
            console.warn("[WebSocket] Nombre maximum de tentatives de reconnexion atteint");
            toast.error("Impossible de se connecter aux notifications. Veuillez rafraîchir la page.");
          }
        };
      } catch (error) {
        console.error("[WebSocket] Erreur connexion:", error);
        setWsConnected(false);
      }
    };

    connect();

    // Heartbeat pour maintenir la connexion
    const heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Toutes les 30 secondes

    return () => {
      clearInterval(heartbeatInterval);
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
        wsRef.current = null;
      }
      reconnectAttemptsRef.current = 0; // Réinitialiser les tentatives au nettoyage
    };
  }, [token, driverId, isOnline]); // Retirer wsReconnectAttempts des dépendances

  // Nettoyer les timers de visibilité et les intervalles de son au démontage
  useEffect(() => {
    return () => {
      console.log("[Sound] 🧹 Nettoyage de tous les intervalles de son au démontage");
      orderTimersRef.current.forEach(timer => clearTimeout(timer));
      orderTimersRef.current.clear();
      soundIntervalsRef.current.forEach((interval, orderId) => {
        console.log(`[Sound] 🧹 Arrêt intervalle son pour ${orderId}`);
        clearInterval(interval);
      });
      soundIntervalsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setLocation("/driver/login");
      return;
    }
    
    fetchOrders();
    fetchStatus();
    // Augmenter l'intervalle pour éviter de perturber les timers de visibilité
    // Les timers durent 30 secondes, donc on vérifie toutes les 30 secondes
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000); // 30 secondes pour ne pas perturber les timers de visibilité
    
    return () => {
      clearInterval(interval);
      // Nettoyer tous les intervalles de son au démontage
      console.log("[Sound] 🧹 Nettoyage de tous les intervalles de son au démontage");
      soundIntervalsRef.current.forEach((interval, orderId) => {
        console.log(`[Sound] 🧹 Arrêt intervalle son pour ${orderId}`);
        clearInterval(interval);
      });
      soundIntervalsRef.current.clear();
    };
  }, [token, setLocation]);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/driver/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsOnline(data.status !== "offline");
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  const toggleStatus = async () => {
    try {
      const res = await fetch("/api/driver/toggle-status", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsOnline(data.status !== "offline");
        toast.success(data.status === "offline" ? "Hors ligne" : "En ligne");
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
      toast.error("Erreur lors du changement de statut");
    }
  };

  // Fonction pour afficher une commande (démarre le cycle de visibilité)
  // Fonction pour démarrer la répétition du son pour une commande
  const startSoundRepetition = (orderId: string) => {
    console.log(`[Sound] 🔊 Démarrage répétition son pour commande ${orderId}`);
    
    // Arrêter l'intervalle existant si présent
    const existingInterval = soundIntervalsRef.current.get(orderId);
    if (existingInterval) {
      console.log(`[Sound] ⏹️ Arrêt intervalle son existant pour ${orderId}`);
      clearInterval(existingInterval);
    }
    
    // Jouer le son immédiatement
    console.log(`[Sound] 🎵 Premier son pour commande ${orderId}`);
    playOrderNotificationSound();
    
    // Créer un nouvel intervalle qui répète le son toutes les SOUND_REPEAT_INTERVAL ms
    const soundInterval = setInterval(() => {
      // Vérifier UNIQUEMENT que la commande est toujours disponible (pas acceptée)
      // Ne pas vérifier isVisible car la commande peut être masquée temporairement
      const orderStillAvailable = availableOrdersRef.current.some(
        o => o.id === orderId && !o.driverId
      );
      
      console.log(`[Sound] 🔁 Répétition son pour ${orderId}:`, {
        orderStillAvailable,
        willPlay: orderStillAvailable
      });
      
      if (orderStillAvailable) {
        console.log(`[Sound] 🎵 Son répété pour commande ${orderId}`);
        playOrderNotificationSound();
      } else {
        console.log(`[Sound] ⏹️ Arrêt répétition son pour ${orderId} - commande acceptée`);
        clearInterval(soundInterval);
        soundIntervalsRef.current.delete(orderId);
      }
    }, SOUND_REPEAT_INTERVAL);
    
    soundIntervalsRef.current.set(orderId, soundInterval);
    console.log(`[Sound] ✅ Répétition son démarrée pour ${orderId}, intervalle: ${SOUND_REPEAT_INTERVAL}ms`);
  };
  
  // Fonction pour arrêter la répétition du son pour une commande
  const stopSoundRepetition = (orderId: string) => {
    console.log(`[Sound] ⏹️ Arrêt répétition son pour commande ${orderId}`);
    const soundInterval = soundIntervalsRef.current.get(orderId);
    if (soundInterval) {
      clearInterval(soundInterval);
      soundIntervalsRef.current.delete(orderId);
      console.log(`[Sound] ✅ Répétition son arrêtée pour ${orderId}`);
    }
  };

  const showOrder = (orderId: string, playSound: boolean = true) => {
    console.log(`[Visibility] Affichage commande ${orderId}`);
    
    // S'assurer que la commande est visible
    setVisibleOrderIds(prev => {
      const newSet = new Set(prev);
      newSet.add(orderId);
      return newSet;
    });
    
    // Démarrer la répétition du son si demandé
    if (playSound) {
      console.log(`[Visibility] Son déclenché pour commande ${orderId}`);
      startSoundRepetition(orderId);
    }
    
    // Nettoyer le timer existant si présent
    const existingTimer = orderTimersRef.current.get(orderId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      console.log(`[Visibility] Timer existant nettoyé pour ${orderId}`);
    }
    
    // Masquer la commande après ORDER_VISIBLE_DURATION
    const hideTimer = setTimeout(() => {
      console.log(`[Visibility] Masquage commande ${orderId} après ${ORDER_VISIBLE_DURATION}ms`);
      setVisibleOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        console.log(`[Visibility] Commande ${orderId} masquée. Visible: ${newSet.has(orderId)}`);
        return newSet;
      });
      
      // NE PAS arrêter le son quand la commande est masquée temporairement
      // Le son continue tant que la commande n'est pas acceptée
      
      // Vérifier si la commande existe toujours dans availableOrders et n'a pas été acceptée
      // Utiliser la ref au lieu de setState pour éviter les boucles infinies
      const orderStillAvailable = availableOrdersRef.current.some(o => o.id === orderId && !o.driverId);
      
      if (orderStillAvailable) {
        console.log(`[Visibility] Commande ${orderId} toujours disponible, réaffichage dans ${ORDER_HIDDEN_DURATION}ms`);
        // Réafficher après ORDER_HIDDEN_DURATION
        const showTimer = setTimeout(() => {
          console.log(`[Visibility] Réaffichage commande ${orderId} après ${ORDER_HIDDEN_DURATION}ms`);
          // Réafficher la commande et redémarrer le cycle AVEC SON
          setVisibleOrderIds(prev => {
            const newSet = new Set(prev);
            newSet.add(orderId);
            return newSet;
          });
          // Redémarrer le cycle de visibilité avec son
          showOrder(orderId, true); // true = jouer le son à chaque réapparition
        }, ORDER_HIDDEN_DURATION);
        
        orderTimersRef.current.set(orderId, showTimer);
      } else {
        console.log(`[Visibility] Commande ${orderId} n'est plus disponible, arrêt du cycle`);
        orderTimersRef.current.delete(orderId);
        // Arrêter définitivement la répétition du son
        stopSoundRepetition(orderId);
      }
    }, ORDER_VISIBLE_DURATION);
    
    orderTimersRef.current.set(orderId, hideTimer);
    console.log(`[Visibility] Timer démarré pour ${orderId}, masquage dans ${ORDER_VISIBLE_DURATION}ms`);
  };

  // Fonction pour masquer définitivement une commande (quand acceptée)
  const hideOrderPermanently = (orderId: string) => {
    console.log(`[Visibility] Masquage permanent de la commande ${orderId}`);
    // Arrêter la répétition du son
    stopSoundRepetition(orderId);
    
    setVisibleOrderIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });
    
    const timer = orderTimersRef.current.get(orderId);
    if (timer) {
      clearTimeout(timer);
      orderTimersRef.current.delete(orderId);
    }
  };

  const fetchOrders = async () => {
    try {
      const [availableRes, myRes] = await Promise.all([
        fetch("/api/driver/available-orders", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/driver/orders", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      if (availableRes.ok) {
        const data = await availableRes.json();
        console.log("[Driver] Commandes disponibles récupérées:", data.length);
        
        // LOG DÉTAILLÉ : Voir toutes les commandes avec leurs détails
        console.log("[DEBUG] Détails des commandes disponibles:", data.map((o: Order) => ({
          id: o.id,
          status: o.status,
          driverId: o.driverId || "AUCUN",
          restaurantName: o.restaurantName || "N/A",
          customerName: o.customerName || "N/A",
          totalPrice: o.totalPrice
        })));
        
        // LOG : Afficher la première commande complète pour debug
        if (data.length > 0) {
          console.log("[DEBUG] 🔍 Première commande complète:", JSON.stringify(data[0], null, 2));
        }
        
        // Détecter les nouvelles commandes disponibles (pas encore assignées)
        const previousOrderIds = new Set(availableOrdersRef.current.map(o => o.id));
        const newOrders = data.filter((o: Order) => 
          !previousOrderIds.has(o.id) && !o.driverId
        );
        
        // LOG : Comparaison avant/après
        console.log("[DEBUG] Commandes précédentes:", previousOrderIds.size);
        console.log("[DEBUG] Nouvelles commandes:", newOrders.length);
        console.log("[DEBUG] IDs des nouvelles commandes:", newOrders.map((o: Order) => o.id));
        
        // Note: Le son sera joué dans showOrder() pour chaque commande affichée
        // Pas besoin de jouer le son ici pour éviter les doublons
        if (newOrders.length > 0 && previousOrderIds.size > 0) {
          console.log("[Driver] Nouvelles commandes détectées:", newOrders.length);
        }
        
        // LOG : Vérifier si des commandes ont disparu
        const currentOrderIds = new Set(data.map((o: Order) => o.id));
        const disappearedOrders = Array.from(previousOrderIds).filter(id => !currentOrderIds.has(id));
        if (disappearedOrders.length > 0) {
          console.log("[DEBUG] ⚠️ Commandes qui ont disparu:", disappearedOrders);
        }
        
        // Mettre à jour la ref AVANT de mettre à jour l'état
        availableOrdersRef.current = data;
        setAvailableOrders(data);
        
        // Gérer la visibilité des commandes
        const ordersToShow: string[] = [];
        const currentVisibleIds = new Set(visibleOrderIds);
        
        // Vérifier chaque commande disponible
        data.forEach((order: Order) => {
          if (!order.driverId) {
            const isVisible = currentVisibleIds.has(order.id);
            const hasTimer = orderTimersRef.current.has(order.id);
            
            console.log(`[Visibility] Commande ${order.id}: visible=${isVisible}, timer=${hasTimer}`);
            
            if (!isVisible && !hasTimer) {
              // Nouvelle commande : l'ajouter à visibleOrderIds et démarrer le timer
              ordersToShow.push(order.id);
            }
            // Ne pas redémarrer le timer si un timer est déjà actif, même si visible=false
            // Le timer va se terminer et masquer la commande, puis la réafficher
          }
        });
        
        // Mettre à jour visibleOrderIds
        setVisibleOrderIds(prev => {
          const newSet = new Set(prev);
          
          // Ajouter toutes les nouvelles commandes sans driverId
          data.forEach((order: Order) => {
            if (!order.driverId) {
              newSet.add(order.id);
            }
          });
          
          // Retirer les commandes qui n'existent plus ou qui ont été acceptées
          const toRemove: string[] = [];
          newSet.forEach(orderId => {
            const orderExists = data.some((o: Order) => o.id === orderId && !o.driverId);
            if (!orderExists) {
              toRemove.push(orderId);
            }
          });
          
          toRemove.forEach(orderId => {
            newSet.delete(orderId);
            hideOrderPermanently(orderId);
          });
          
          return newSet;
        });
        
        // Démarrer les timers pour les commandes APRÈS la mise à jour du state
        console.log(`[Visibility] ${ordersToShow.length} commande(s) à afficher:`, ordersToShow);
        console.log(`[Visibility] Commandes disponibles:`, data.map((o: Order) => ({ id: o.id, driverId: o.driverId })));
        console.log(`[Visibility] Timers actifs:`, Array.from(orderTimersRef.current.keys()));
        ordersToShow.forEach(orderId => {
          setTimeout(() => {
            showOrder(orderId, true); // true = jouer le son à chaque affichage
          }, 100);
        });
      }
      if (myRes.ok) {
        const data = await myRes.json();
        console.log("[Driver] Mes commandes récupérées:", data.length);
        
        // LOG DÉTAILLÉ : Voir toutes les commandes du livreur
        console.log("[DEBUG] Détails de mes commandes:", data.map((o: Order) => ({
          id: o.id,
          status: o.status,
          driverId: o.driverId || "AUCUN",
          restaurantName: o.restaurantName || "N/A",
          customerName: o.customerName || "N/A"
        })));
        
        setMyOrders(data);
      }
      setError("");
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      console.log("[DEBUG] ✅ fetchOrders terminé - setLoading(false)");
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    console.log(`[Driver] 🎯 Acceptation commande ${orderId}`);
    setUpdating(orderId);
    try {
      // Arrêter immédiatement la répétition du son
      stopSoundRepetition(orderId);
      // Masquer immédiatement la commande acceptée
      hideOrderPermanently(orderId);
      
      // Essayer d'abord via WebSocket si connecté
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "accept_order",
          orderId: orderId
        }));
        toast.info("Demande d'acceptation envoyée...");
        // Le WebSocket handler gérera la réponse et mettra à jour l'état
        // Ne pas appeler fetchOrders ici, la réponse WebSocket le fera
        return;
      }

      // Fallback sur API REST
      const res = await fetch(`/api/driver/orders/${orderId}/accept`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      // Mettre à jour le statut directement à "delivery" (en route)
      const updateRes = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: "delivery" }),
      });
      if (updateRes.ok) {
        toast.success("Commande acceptée! En route vers le client.");
        // Retirer immédiatement de la liste des disponibles
        setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
        await fetchOrders();
      } else {
        toast.success("Commande acceptée!");
        setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
        await fetchOrders();
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      setUpdating(null);
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: "delivery" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      toast.success("C'est parti! Bonne livraison!");
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleDelivered = async (orderId: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: "delivered" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      toast.success("Commande livrée!");
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverId");
    localStorage.removeItem("driverName");
    localStorage.removeItem("driverPhone");
    setLocation("/driver/login");
  };

  // Utiliser les helpers centralisés (déjà importés)

  // MVP: Workflow simplifié - fusionner "En attente" et "En livraison" en un seul onglet "Mes livraisons"
  const activeDeliveryOrders = myOrders.filter(o => ["accepted", "ready", "delivery"].includes(o.status));
  const deliveredOrders = myOrders.filter(o => o.status === "delivered");

  // Toutes les commandes à afficher (disponibles + en cours)
  const allOrdersToShow = [
    // Afficher TOUTES les commandes disponibles (pas seulement celles "visibles")
    ...availableOrders.filter(order => {
      const hasNoDriver = !order.driverId;
      const isVisible = visibleOrderIds.has(order.id);
      const hasTimer = orderTimersRef.current.has(order.id);
      
      // LOG pour chaque commande filtrée
      if (!hasNoDriver) {
        console.log(`[DEBUG] ❌ Commande ${order.id.slice(0, 8)}... filtrée: a un driverId (${order.driverId})`);
      } else {
        console.log(`[DEBUG] ✅ Commande ${order.id.slice(0, 8)}... PASSERA le filtre:`, {
          hasNoDriver,
          isVisible,
          hasTimer,
          status: order.status,
          restaurantName: order.restaurantName,
          visibleOrderIds: Array.from(visibleOrderIds)
        });
      }
      
      return hasNoDriver;
    }),
    // + toutes les commandes en cours du livreur
    ...activeDeliveryOrders,
  ];

  // LOG : Résumé de ce qui sera affiché
  console.log("[DEBUG] 📊 Résumé des commandes:");
  console.log(`  - Commandes disponibles (total): ${availableOrders.length}`);
  console.log(`  - Commandes disponibles (sans driver): ${availableOrders.filter(o => !o.driverId).length}`);
  console.log(`  - Commandes en cours: ${activeDeliveryOrders.length}`);
  console.log(`  - TOTAL à afficher: ${allOrdersToShow.length}`);
  console.log(`  - IDs à afficher:`, allOrdersToShow.map(o => o.id.slice(0, 8)));

  // Calculer les statistiques
  const totalEarnings = deliveredOrders.reduce((sum, o) => sum + Number(o.totalPrice) * DRIVER_COMMISSION_RATE, 0);
  const totalDeliveries = deliveredOrders.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simplifié */}
      <div className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="bg-primary text-primary-foreground p-2 rounded-full flex-shrink-0">
                <Bike className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="font-serif font-bold text-base md:text-lg truncate">Espace Livreur</h1>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{driverName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={fetchOrders} className="px-2 md:px-3">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Sheet open={showMenu} onOpenChange={setShowMenu}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="px-2 md:px-3">
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 sm:w-96">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Menu
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-2">
                    {/* Statistiques */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => {
                        setShowStatsDialog(true);
                        setShowMenu(false);
                      }}
                    >
                      <div className="bg-emerald-100 p-2 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Statistiques</p>
                        <p className="text-xs text-muted-foreground">Gains et livraisons</p>
                      </div>
                    </Button>

                    {/* Statut */}
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Power className={`w-5 h-5 ${isOnline ? 'text-green-600' : 'text-red-600'}`} />
                          <span className="font-medium">Statut</span>
                        </div>
                        <Switch checked={isOnline} onCheckedChange={toggleStatus} />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={isOnline ? 'text-green-700' : 'text-red-700'}>
                          {isOnline ? "En ligne" : "Hors ligne"}
                        </span>
                      </div>
                    </div>

                    {/* Notifications WebSocket */}
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bell className={`w-5 h-5 ${wsConnected ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="font-medium">Notifications</span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {wsConnected ? "Connecté en temps réel" : "Déconnecté"}
                      </p>
                    </div>

                    {/* Historique */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => {
                        setShowHistoryDialog(true);
                        setShowMenu(false);
                      }}
                    >
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <History className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Historique</p>
                        <p className="text-xs text-muted-foreground">
                          {deliveredOrders.length} livraison{deliveredOrders.length > 1 ? 's' : ''} terminée{deliveredOrders.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </Button>

                    {/* Profil */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => {
                        toast.info("Profil - Fonctionnalité à venir");
                        setShowMenu(false);
                      }}
                    >
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Profil</p>
                        <p className="text-xs text-muted-foreground">{driverName}</p>
                      </div>
                    </Button>

                    {/* Déconnexion */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        handleLogout();
                        setShowMenu(false);
                      }}
                    >
                      <div className="bg-red-100 p-2 rounded-lg">
                        <LogOut className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Déconnexion</p>
                        <p className="text-xs text-muted-foreground">Quitter l'application</p>
                      </div>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Page principale - SEULEMENT les commandes */}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {error && (
          <div className="mb-4 flex gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Vue unifiée - Toutes les commandes (disponibles + en cours) */}
        {(() => {
          console.log("[DEBUG] 🎨 RENDU - État du composant:", {
            loading,
            allOrdersToShowLength: allOrdersToShow.length,
            availableOrdersLength: availableOrders.length,
            activeDeliveryOrdersLength: activeDeliveryOrders.length
          });
          return null;
        })()}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : allOrdersToShow.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune commande</h3>
            <p className="text-muted-foreground">
              Les commandes disponibles et en cours apparaîtront ici.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {(() => {
              console.log("[DEBUG] 🎨 RENDU - allOrdersToShow.length:", allOrdersToShow.length);
              console.log("[DEBUG] 🎨 RENDU - allOrdersToShow:", allOrdersToShow.map(o => ({ id: o.id.slice(0, 8), status: o.status, driverId: o.driverId })));
              return null;
            })()}
            {allOrdersToShow.map((order) => {
              console.log(`[DEBUG] 🎨 RENDU - Affichage commande ${order.id.slice(0, 8)}...`);
              const commission = Number(order.totalPrice) * DRIVER_COMMISSION_RATE;
              const isAvailable = !order.driverId;
              const isInDelivery = order.status === "delivery";
              const isReady = order.status === "ready";
              
              // Déterminer l'action selon le statut
              let swipeAction: () => void;
              let swipeLabel: string;
              let swipeColor: "green" | "orange" | "emerald";
              let swipeIcon: React.ReactNode;
              
              if (isAvailable) {
                // Commande disponible → Accepter
                swipeAction = () => handleAcceptOrder(order.id);
                swipeLabel = "Accepter";
                swipeColor = "green";
                swipeIcon = <Check className="w-5 h-5 text-white" />;
              } else if (isReady) {
                // Commande prête → Démarrer livraison
                swipeAction = () => handleStartDelivery(order.id);
                swipeLabel = "Démarrer livraison";
                swipeColor = "orange";
                swipeIcon = <Bike className="w-5 h-5 text-white" />;
              } else if (isInDelivery) {
                // En livraison → Marquer comme livré
                swipeAction = () => handleDelivered(order.id);
                swipeLabel = "Livraison terminée";
                swipeColor = "emerald";
                swipeIcon = <Check className="w-5 h-5 text-white" />;
              } else {
                // Autres statuts (accepted) → Pas d'action swipe
                swipeAction = () => {};
                swipeLabel = "En préparation...";
                swipeColor = "orange";
                swipeIcon = <Clock className="w-5 h-5 text-white" />;
              }
              
              return (
                <Card 
                  key={order.id} 
                  className={`overflow-hidden border-l-4 ${
                    isAvailable ? 'border-l-green-500' : 
                    isInDelivery ? 'border-l-indigo-500' : 
                    'border-l-orange-500'
                  }`}
                  data-testid={`card-${isAvailable ? 'available' : 'active'}-${order.id}`}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(order.status)}>
                          {getDriverStatusLabel(order.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          #{order.id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium">
                          <Banknote className="w-4 h-4" />
                          +{commission.toFixed(2)} TND
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setShowOrderDetails(true);
                          }}
                          className="h-8 px-2 gap-1"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">Détails</span>
                        </Button>
                      </div>
                    </div>

                    {!isInDelivery && (
                      <div className="bg-orange-50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2 text-orange-700 font-medium text-sm">
                          <Store className="w-4 h-4" />
                          Récupérer chez:
                        </div>
                        <p className="font-semibold">{order.restaurantName || "Restaurant"}</p>
                        <p className="text-sm text-muted-foreground">{order.restaurantAddress}</p>
                      </div>
                    )}

                    <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                          <Navigation className="w-4 h-4" />
                          Livrer à:
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowCustomerDialog(true);
                          }}
                          className="h-7 text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Détails
                        </Button>
                      </div>
                      <p className="font-semibold">{order.customerName}</p>
                      <p className="text-sm">{order.address}</p>
                      {order.addressDetails && (
                        <p className="text-xs text-muted-foreground">{order.addressDetails}</p>
                      )}
                      <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1">
                        <Phone className="w-3 h-3" />
                        {order.phone}
                      </a>
                    </div>

                    <div className="pt-2 border-t space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total commande</p>
                          <p className="font-bold text-lg">{Number(order.totalPrice).toFixed(2)} TND</p>
                        </div>
                      </div>
                      
                      {/* Bouton swipe pour mobile */}
                      {(() => {
                        const shouldShowSwipe = isAvailable || isReady || isInDelivery;
                        console.log(`[DriverDashboard] 🎯 SwipeButton pour ${order.id.slice(0, 8)}:`, {
                          isAvailable,
                          isReady,
                          isInDelivery,
                          shouldShowSwipe,
                          status: order.status,
                          swipeLabel,
                          disabled: updating === order.id
                        });
                        return shouldShowSwipe ? (
                          <SwipeButton
                            onSwipe={swipeAction}
                            disabled={updating === order.id}
                            label={swipeLabel}
                            icon={swipeIcon}
                            color={swipeColor}
                          />
                        ) : (
                          <div className="text-center text-orange-600 font-medium py-2 px-4 bg-orange-100 rounded-lg text-sm">
                            En préparation...
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Détails Client */}
      {showCustomerDialog && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCustomerDialog(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Informations Client</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomerDialog(false)}
                  className="h-8 w-8 p-0"
                >
                  <AlertCircle className="w-4 h-4 rotate-45" />
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Détails de livraison pour la commande #{selectedOrder.id.slice(0, 8)}
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nom du client</p>
                  <p className="font-semibold text-lg">{selectedOrder.customerName}</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Téléphone</p>
                  <a 
                    href={`tel:${selectedOrder.phone}`} 
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    {selectedOrder.phone}
                  </a>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Adresse de livraison</p>
                  <p className="font-medium">{selectedOrder.address}</p>
                  {selectedOrder.addressDetails && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedOrder.addressDetails}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // Utiliser les coordonnées GPS si disponibles, sinon l'adresse textuelle
                    const lat = selectedOrder.customerLat ? Number(selectedOrder.customerLat) : null;
                    const lng = selectedOrder.customerLng ? Number(selectedOrder.customerLng) : null;
                    
                    console.log("[Navigation] Coordonnées GPS:", { lat, lng, address: selectedOrder.address });
                    
                    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                      // Utiliser /dir/ pour la navigation (itinéraire) avec les coordonnées GPS exactes
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                      console.log("[Navigation] URL Maps avec GPS:", url);
                      window.open(url, '_blank');
                    } else {
                      // Fallback: utiliser l'adresse textuelle avec la ville pour plus de précision
                      // Ajouter "Tataouine, Tunisie" pour éviter les ambiguïtés
                      const addressWithCity = `${selectedOrder.address}, Tataouine, Tunisie`;
                      const address = encodeURIComponent(addressWithCity);
                      const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
                      console.log("[Navigation] URL Maps avec adresse (pas de GPS):", url);
                      // Afficher un avertissement que les coordonnées GPS ne sont pas disponibles
                      toast.warning("Coordonnées GPS non disponibles, utilisation de l'adresse textuelle", {
                        description: "Cette commande a été créée avant l'ajout du GPS. La navigation peut être moins précise.",
                        duration: 5000,
                      });
                      window.open(url, '_blank');
                    }
                  }}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Naviguer vers client
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(`tel:${selectedOrder.phone}`, '_self');
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Appeler
                </Button>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Total commande</p>
                <p className="font-bold text-xl">{Number(selectedOrder.totalPrice).toFixed(2)} TND</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Statistiques */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Statistiques
            </DialogTitle>
            <DialogDescription>
              Vos gains et performances de livraison
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Total gagné */}
            <Card className="p-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Total gagné</p>
                  <p className="text-3xl font-bold mt-1">
                    {totalEarnings.toFixed(2)} TND
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Banknote className="w-8 h-8" />
                </div>
              </div>
            </Card>

            {/* Stats détaillées */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center border-l-4 border-l-green-500">
                <p className="text-xs text-muted-foreground mb-1">Disponibles</p>
                <p className="text-2xl font-bold text-green-600">{availableOrders.length}</p>
              </Card>
              <Card className="p-3 text-center border-l-4 border-l-indigo-500">
                <p className="text-xs text-muted-foreground mb-1">En cours</p>
                <p className="text-2xl font-bold text-indigo-600">{activeDeliveryOrders.length}</p>
              </Card>
              <Card className="p-3 text-center border-l-4 border-l-emerald-500">
                <p className="text-xs text-muted-foreground mb-1">Livrées</p>
                <p className="text-2xl font-bold text-emerald-600">{totalDeliveries}</p>
              </Card>
            </div>

            {/* Détails livraisons */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Détails des livraisons</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livraisons complétées</span>
                  <span className="font-medium">{totalDeliveries}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Commission par livraison</span>
                  <span className="font-medium">15%</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Gain moyen</span>
                  <span className="font-medium">
                    {totalDeliveries > 0 ? (totalEarnings / totalDeliveries).toFixed(2) : "0.00"} TND
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        orderId={selectedOrderId}
        open={showOrderDetails}
        onOpenChange={setShowOrderDetails}
        role="driver"
      />

      {/* Dialog Historique */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              Historique des livraisons
            </DialogTitle>
            <DialogDescription>
              {deliveredOrders.length} livraison{deliveredOrders.length > 1 ? 's' : ''} terminée{deliveredOrders.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          {deliveredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Check className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune livraison terminée</h3>
              <p className="text-muted-foreground">Vos livraisons complétées apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {deliveredOrders.map((order) => {
                const commission = Number(order.totalPrice) * DRIVER_COMMISSION_RATE;
                return (
                  <Card key={order.id} className="overflow-hidden opacity-90">
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-100 text-emerald-800">
                            Livrée
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-700 font-medium text-sm">
                          <Banknote className="w-4 h-4" />
                          +{commission.toFixed(2)} TND
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-muted-foreground">{order.address}</p>
                        </div>
                        <p className="font-bold">{Number(order.totalPrice).toFixed(2)} TND</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bannière de permission audio */}
      <AudioPermissionBanner />
    </div>
  );
}
