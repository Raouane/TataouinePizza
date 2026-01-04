import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, Trash2, CreditCard, Star, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { StripeCardForm } from "@/components/stripe-card-form";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { getOnboarding } from "@/pages/onboarding";

interface PaymentMethodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaymentMethod {
  id: string;
  type: string;
  billing_details?: {
    name: string | null;
    email: string | null;
  } | null;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
}

/**
 * Récupère le numéro de téléphone de l'utilisateur
 */
const getUserPhone = (): string | null => {
  const onboarding = getOnboarding();
  if (onboarding?.phone) {
    return onboarding.phone;
  }
  return localStorage.getItem('customerPhone');
};

// Initialiser Stripe avec la clé publique
// Note: La clé publique Stripe doit être définie dans VITE_STRIPE_PUBLISHABLE_KEY
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Debug : Afficher la clé (tronquée pour la sécurité)
if (stripePublishableKey) {
  console.log('[Stripe] ✅ Clé publique chargée:', stripePublishableKey.substring(0, 20) + '...' + stripePublishableKey.substring(stripePublishableKey.length - 10));
  console.log('[Stripe] Longueur de la clé:', stripePublishableKey.length);
  
  // Vérifier le format de la clé
  if (!stripePublishableKey.startsWith('pk_test_') && !stripePublishableKey.startsWith('pk_live_')) {
    console.error('[Stripe] ❌ Format de clé invalide. Doit commencer par pk_test_ ou pk_live_');
  }
} else {
  console.error('[Stripe] ❌ VITE_STRIPE_PUBLISHABLE_KEY n\'est pas définie dans .env');
  console.error('[Stripe] Vérifiez que:');
  console.error('[Stripe] 1. Le fichier .env existe à la racine du projet');
  console.error('[Stripe] 2. VITE_STRIPE_PUBLISHABLE_KEY est défini dans .env');
  console.error('[Stripe] 3. Le serveur a été redémarré après l\'ajout de la variable');
}

const stripePromise = stripePublishableKey && stripePublishableKey.startsWith('pk_')
  ? loadStripe(stripePublishableKey.trim())
  : null;

// Helper pour formater le nom de la marque de carte
const formatCardBrand = (brand: string): string => {
  const brands: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    jcb: 'JCB',
    diners: 'Diners Club',
    unionpay: 'UnionPay',
  };
  return brands[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
};

export function PaymentMethodsDialog({ open, onOpenChange }: PaymentMethodsDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);

  // Charger les cartes quand le dialog s'ouvre
  useEffect(() => {
    if (open && !showAddCardForm) {
      loadPaymentMethods();
    }
  }, [open, showAddCardForm]);

  const loadPaymentMethods = async () => {
    const customerPhone = getUserPhone();
    if (!customerPhone) {
      setPaymentMethods([]);
      return;
    }

    setLoading(true);
    try {
      // Récupérer les payment_method_ids depuis localStorage
      const paymentMethodsKey = `paymentMethods_${customerPhone}`;
      const defaultKey = `defaultPaymentMethod_${customerPhone}`;
      const saved = localStorage.getItem(paymentMethodsKey);
      const defaultId = localStorage.getItem(defaultKey);
      
      if (defaultId) {
        setDefaultPaymentMethodId(defaultId);
      }
      
      if (!saved) {
        setPaymentMethods([]);
        setLoading(false);
        return;
      }

      const paymentMethodIds: string[] = JSON.parse(saved);
      
      if (paymentMethodIds.length === 0) {
        setPaymentMethods([]);
        setLoading(false);
        return;
      }

      // Récupérer les détails depuis l'API
      const response = await fetch('/api/stripe/get-payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ paymentMethodIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to load payment methods');
      }

      const { paymentMethods: methods } = await response.json();
      
      // Vérifier les cartes expirées
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      const validMethods = methods.filter((pm: PaymentMethod) => {
        if (!pm.card) return true;
        const expYear = pm.card.exp_year;
        const expMonth = pm.card.exp_month;
        
        // Vérifier si la carte est expirée
        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          console.warn(`[PaymentMethodsDialog] ⚠️ Carte expirée détectée: ${pm.id}`);
          return false; // Filtrer les cartes expirées
        }
        return true;
      });
      
      // Si des cartes ont été filtrées, mettre à jour localStorage
      if (validMethods.length < methods.length) {
        const validIds = validMethods.map((pm: PaymentMethod) => pm.id);
        localStorage.setItem(paymentMethodsKey, JSON.stringify(validIds));
        
        // Si la carte par défaut était expirée, la retirer
        if (defaultId && !validIds.includes(defaultId)) {
          localStorage.removeItem(defaultKey);
          setDefaultPaymentMethodId(null);
        } else if (defaultId) {
          setDefaultPaymentMethodId(defaultId);
        }
        
        toast({
          title: language === 'ar' 
            ? 'تمت إزالة البطاقات المنتهية الصلاحية' 
            : language === 'en' 
            ? 'Expired cards removed' 
            : 'Cartes expirées supprimées',
          description: language === 'ar' 
            ? 'تمت إزالة البطاقات المنتهية الصلاحية تلقائياً' 
            : language === 'en' 
            ? 'Expired cards have been automatically removed' 
            : 'Les cartes expirées ont été automatiquement supprimées',
        });
      }
      
      setPaymentMethods(validMethods);
    } catch (error) {
      console.error('[PaymentMethodsDialog] Erreur chargement cartes:', error);
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = () => {
    setShowAddCardForm(true);
  };

  const handleCancelAddCard = () => {
    setShowAddCardForm(false);
  };

  const handleCardAdded = () => {
    // Rafraîchir la liste des cartes après ajout
    setShowAddCardForm(false);
    loadPaymentMethods();
  };

  const handleSetDefault = (paymentMethodId: string) => {
    const customerPhone = getUserPhone();
    if (!customerPhone) return;

    const defaultKey = `defaultPaymentMethod_${customerPhone}`;
    localStorage.setItem(defaultKey, paymentMethodId);
    setDefaultPaymentMethodId(paymentMethodId);

    toast({
      title: language === 'ar' 
        ? 'تم تعيين البطاقة كافتراضية' 
        : language === 'en' 
        ? 'Default card set' 
        : 'Carte par défaut définie',
      description: language === 'ar' 
        ? 'سيتم استخدام هذه البطاقة افتراضياً للدفع' 
        : language === 'en' 
        ? 'This card will be used by default for payments' 
        : 'Cette carte sera utilisée par défaut pour les paiements',
    });
  };

  const handleDeleteCard = async (paymentMethodId: string) => {
    if (!confirm(
      language === 'ar' 
        ? 'هل أنت متأكد من حذف هذه البطاقة؟' 
        : language === 'en' 
        ? 'Are you sure you want to delete this card?' 
        : 'Êtes-vous sûr de vouloir supprimer cette carte ?'
    )) {
      return;
    }

    try {
      // Supprimer depuis Stripe
      const response = await fetch('/api/stripe/delete-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }

      // Supprimer depuis localStorage
      const customerPhone = getUserPhone();
      if (customerPhone) {
        const paymentMethodsKey = `paymentMethods_${customerPhone}`;
        const defaultKey = `defaultPaymentMethod_${customerPhone}`;
        const saved = localStorage.getItem(paymentMethodsKey);
        if (saved) {
          const paymentMethodIds: string[] = JSON.parse(saved);
          const updated = paymentMethodIds.filter(id => id !== paymentMethodId);
          localStorage.setItem(paymentMethodsKey, JSON.stringify(updated));
        }
        
        // Si la carte supprimée était la carte par défaut, la retirer
        if (defaultPaymentMethodId === paymentMethodId) {
          localStorage.removeItem(defaultKey);
          setDefaultPaymentMethodId(null);
        }
      }

      // Rafraîchir la liste
      await loadPaymentMethods();

      toast({
        title: language === 'ar' 
          ? 'تم حذف البطاقة' 
          : language === 'en' 
          ? 'Card deleted' 
          : 'Carte supprimée',
        description: language === 'ar' 
          ? 'تم حذف البطاقة بنجاح' 
          : language === 'en' 
          ? 'The card has been successfully deleted' 
          : 'La carte a été supprimée avec succès',
      });
    } catch (error) {
      console.error('[PaymentMethodsDialog] Erreur suppression carte:', error);
      toast({
        title: language === 'ar' 
          ? 'خطأ' 
          : language === 'en' 
          ? 'Error' 
          : 'Erreur',
        description: language === 'ar' 
          ? 'فشل في حذف البطاقة' 
          : language === 'en' 
          ? 'Failed to delete the card' 
          : 'Échec de la suppression de la carte',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" role="dialog" aria-modal="true">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'بطاقاتي' : language === 'en' ? 'My Cards' : 'Mes Cartes'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'إدارة طرق الدفع الخاصة بك' 
              : language === 'en' 
              ? 'Manage your payment methods' 
              : 'Gérez vos méthodes de paiement'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {showAddCardForm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {language === 'ar' 
                    ? 'إضافة بطاقة جديدة' 
                    : language === 'en' 
                    ? 'Add New Card' 
                    : 'Ajouter une nouvelle carte'}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCancelAddCard}
                  aria-label={language === 'ar' ? 'إلغاء' : language === 'en' ? 'Cancel' : 'Annuler'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Formulaire Stripe */}
              {stripePromise ? (
                <Elements stripe={stripePromise}>
                  <StripeCardForm 
                    onSuccess={handleCardAdded}
                    onCancel={handleCancelAddCard}
                  />
                </Elements>
              ) : (
                <div className="p-4 text-center text-destructive">
                  <p className="text-sm">
                    {language === 'ar' 
                      ? 'خطأ في تكوين Stripe. يرجى التحقق من إعدادات البيئة.' 
                      : language === 'en' 
                      ? 'Stripe configuration error. Please check environment settings.' 
                      : 'Erreur de configuration Stripe. Veuillez vérifier les paramètres d\'environnement.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Liste des cartes */}
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    {language === 'ar' 
                      ? 'جاري التحميل...' 
                      : language === 'en' 
                      ? 'Loading...' 
                      : 'Chargement...'}
                  </p>
                </div>
              ) : paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {paymentMethods.map((pm) => (
                    <Card key={pm.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {pm.card 
                                ? `${formatCardBrand(pm.card.brand)} •••• ${pm.card.last4}`
                                : pm.type}
                            </p>
                            {pm.card && (
                              <p className="text-xs text-muted-foreground">
                                {language === 'ar' 
                                  ? `تنتهي في ${pm.card.exp_month}/${pm.card.exp_year}`
                                  : language === 'en' 
                                  ? `Expires ${pm.card.exp_month}/${pm.card.exp_year}`
                                  : `Expire le ${pm.card.exp_month}/${pm.card.exp_year}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteCard(pm.id)}
                          aria-label={language === 'ar' ? 'حذف' : language === 'en' ? 'Delete' : 'Supprimer'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    {language === 'ar' 
                      ? 'لا توجد بطاقات محفوظة' 
                      : language === 'en' 
                      ? 'No saved cards' 
                      : 'Aucune carte enregistrée'}
                  </p>
                </div>
              )}

              {/* Bouton Ajouter une carte */}
              <Button 
                onClick={handleAddCard} 
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' 
                  ? 'إضافة بطاقة' 
                  : language === 'en' 
                  ? 'Add Card' 
                  : 'Ajouter une carte'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
