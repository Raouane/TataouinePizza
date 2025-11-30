import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import { getOrdersByPhone, sendOtp, verifyOtp } from "@/lib/api";
import type { Order } from "@/lib/api";
import { Clock, MapPin, Phone, RefreshCw, Lock } from "lucide-react";

export default function OrderHistory() {
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { t, language } = useLanguage();
  const isRtl = language === "ar";

  const handleSendOtp = async () => {
    if (phone.length < 8) {
      alert(t("cart.error.phone"));
      return;
    }
    
    setOtpLoading(true);
    try {
      await sendOtp(phone);
      setOtpSent(true);
      alert("Code OTP envoyé par SMS");
    } catch (error) {
      alert("Erreur lors de l'envoi du code OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 4) {
      alert("Veuillez entrer un code de 4 chiffres");
      return;
    }
    
    setVerifyLoading(true);
    try {
      const result = await verifyOtp(phone, otpCode);
      if (result.verified) {
        setVerified(true);
        setOtpSent(false);
        setOtpCode("");
        alert("Téléphone vérifié avec succès !");
      } else {
        alert("Code OTP invalide");
      }
    } catch (error) {
      alert("Erreur lors de la vérification du code");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const result = await getOrdersByPhone(phone);
      setOrders(result);
      setSearched(true);
    } catch (error) {
      alert("Erreur lors de la récupération des commandes");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh orders every 5 seconds to update statuses
  useEffect(() => {
    if (!searched || phone.length < 8) return;

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
  }, [searched, phone]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      baking: "bg-orange-100 text-orange-800",
      ready: "bg-green-100 text-green-800",
      delivery: "bg-indigo-100 text-indigo-800",
      delivered: "bg-emerald-100 text-emerald-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Acceptée",
      preparing: "Préparation",
      baking: "Cuisson",
      ready: "Prête",
      delivery: "En livraison",
      delivered: "Livrée",
      rejected: "Rejetée",
    };
    return labels[status] || status;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">Mes Commandes</h1>
          <p className="text-muted-foreground">Consultez l'historique de vos commandes (mise à jour auto)</p>
        </div>
        {refreshing && (
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
        )}
      </div>

      {!verified ? (
        <Card className="p-6 space-y-4 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-blue-900">Vérification de sécurité requise</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Numéro de téléphone</label>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="Ex: 21123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={otpSent}
                className="flex-1"
                data-testid="input-phone-verify"
              />
              <Button
                onClick={handleSendOtp}
                disabled={otpLoading || otpSent}
                variant={otpSent ? "outline" : "default"}
                data-testid="button-send-otp"
              >
                {otpLoading ? "Envoi..." : otpSent ? "Code envoyé ✓" : "Envoyer OTP"}
              </Button>
            </div>
          </div>

          {otpSent && (
            <div>
              <label className="block text-sm font-medium mb-2">Code OTP (4 chiffres)</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Ex: 1234"
                  maxLength={4}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="flex-1"
                  data-testid="input-otp-verify"
                />
                <Button
                  onClick={handleVerifyOtp}
                  disabled={verifyLoading}
                  data-testid="button-verify-otp"
                >
                  {verifyLoading ? "Vérif..." : "Vérifier"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Code démo pour test: 1234
              </p>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6 space-y-4 border-green-200 bg-green-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-green-600">✓ Téléphone vérifié</p>
              <p className="font-semibold">{phone}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setVerified(false);
                setPhone("");
                setOtpCode("");
                setOtpSent(false);
                setSearched(false);
                setOrders([]);
              }}
              data-testid="button-change-phone"
            >
              Changer
            </Button>
          </div>
        </Card>
      )}

      {verified && (
        <Card className="p-6 space-y-4">
          <label className="block text-sm font-medium">Afficher mes commandes</label>
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="w-full"
            data-testid="button-search-orders"
          >
            {loading ? "Recherche..." : "Voir mes commandes"}
          </Button>
        </Card>
      )}

      {searched && (
        <>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">Aucune commande trouvée</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{orders.length} commande(s) trouvée(s)</p>
              {orders.map((order) => (
                <Card key={order.id} className="p-4 space-y-3" data-testid={`order-card-${order.id}`}>
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
                      data-testid={`status-${order.status}`}
                    >
                      {getStatusLabel(order.status)}
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

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                    <Clock className="w-3 h-3" />
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "Date indisponible"}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
