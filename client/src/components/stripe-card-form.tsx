import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { getOnboarding } from "@/pages/onboarding";

interface StripeCardFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Récupère le numéro de téléphone de l'utilisateur
 * Priorité : onboarding > customerPhone (localStorage)
 */
const getUserPhone = (): string | null => {
  const onboarding = getOnboarding();
  if (onboarding?.phone) {
    return onboarding.phone;
  }
  return localStorage.getItem('customerPhone');
};

export function StripeCardForm({ onSuccess, onCancel }: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError(
        language === 'ar' 
          ? 'عنصر البطاقة غير موجود' 
          : language === 'en' 
          ? 'Card element not found' 
          : 'Élément de carte introuvable'
      );
      setIsProcessing(false);
      return;
    }

    // Récupérer le numéro de téléphone de l'utilisateur
    const customerPhone = getUserPhone();
    if (!customerPhone) {
      setError(
        language === 'ar' 
          ? 'يرجى إضافة رقم الهاتف أولاً' 
          : language === 'en' 
          ? 'Please add your phone number first' 
          : 'Veuillez d\'abord ajouter votre numéro de téléphone'
      );
      setIsProcessing(false);
      return;
    }

    try {
      // Étape 1 : Créer un SetupIntent via l'API backend
      const response = await fetch('/api/stripe/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ customerPhone }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          (language === 'ar' 
            ? 'فشل في إنشاء نية الإعداد' 
            : language === 'en' 
            ? 'Failed to create setup intent' 
            : 'Échec de la création de l\'intention de configuration')
        );
      }

      const { clientSecret } = await response.json();

      if (!clientSecret) {
        throw new Error(
          language === 'ar' 
            ? 'لم يتم استلام client_secret' 
            : language === 'en' 
            ? 'client_secret not received' 
            : 'client_secret non reçu'
        );
      }

      // Étape 2 : Confirmer la carte avec Stripe
      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (confirmError) {
        setError(
          confirmError.message || 
          (language === 'ar' 
            ? 'فشل في التحقق من البطاقة' 
            : language === 'en' 
            ? 'Failed to verify card' 
            : 'Échec de la vérification de la carte')
        );
        setIsProcessing(false);
        return;
      }

      if (!setupIntent || !setupIntent.payment_method) {
        throw new Error(
          language === 'ar' 
            ? 'لم يتم إنشاء طريقة الدفع' 
            : language === 'en' 
            ? 'Payment method not created' 
            : 'Méthode de paiement non créée'
        );
      }

      // Étape 3 : Stocker le payment_method_id dans localStorage
      const paymentMethodId = setupIntent.payment_method as string;
      const paymentMethodsKey = `paymentMethods_${customerPhone}`;
      
      // Récupérer les méthodes de paiement existantes
      const existingMethods = localStorage.getItem(paymentMethodsKey);
      let paymentMethods: string[] = [];
      
      if (existingMethods) {
        try {
          paymentMethods = JSON.parse(existingMethods);
        } catch (e) {
          console.error('[StripeCardForm] Erreur parsing payment methods:', e);
        }
      }

      // Ajouter la nouvelle méthode si elle n'existe pas déjà
      if (!paymentMethods.includes(paymentMethodId)) {
        paymentMethods.push(paymentMethodId);
        localStorage.setItem(paymentMethodsKey, JSON.stringify(paymentMethods));
        console.log(`[StripeCardForm] ✅ Méthode de paiement sauvegardée: ${paymentMethodId}`);
      }

      // Étape 4 : Afficher un toast de succès
      toast({
        title: language === 'ar' 
          ? 'تم حفظ البطاقة بنجاح' 
          : language === 'en' 
          ? 'Card saved successfully' 
          : 'Carte enregistrée avec succès',
        description: language === 'ar' 
          ? 'يمكنك الآن استخدام هذه البطاقة للدفع' 
          : language === 'en' 
          ? 'You can now use this card for payments' 
          : 'Vous pouvez maintenant utiliser cette carte pour les paiements',
      });

      // Étape 5 : Appeler onSuccess pour fermer le dialog
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('[StripeCardForm] Erreur lors de l\'enregistrement:', err);
      setError(
        err.message || 
        (language === 'ar' 
          ? 'حدث خطأ أثناء حفظ البطاقة' 
          : language === 'en' 
          ? 'An error occurred while saving the card' 
          : 'Une erreur s\'est produite lors de l\'enregistrement de la carte')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#32325d',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
    hidePostalCode: false,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Champ de carte Stripe */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {language === 'ar' 
            ? 'معلومات البطاقة' 
            : language === 'en' 
            ? 'Card Information' 
            : 'Informations de la carte'}
        </label>
        <div className="p-3 border border-input rounded-md bg-background focus-within:ring-1 focus-within:ring-ring">
          <CardElement 
            options={cardElementOptions}
            className="stripe-card-element"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isProcessing}
          >
            {language === 'ar' 
              ? 'إلغاء' 
              : language === 'en' 
              ? 'Cancel' 
              : 'Annuler'}
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          disabled={!stripe || isProcessing}
        >
          {isProcessing 
            ? (language === 'ar' 
                ? 'جاري المعالجة...' 
                : language === 'en' 
                ? 'Processing...' 
                : 'Traitement...')
            : (language === 'ar' 
                ? 'حفظ البطاقة' 
                : language === 'en' 
                ? 'Save Card' 
                : 'Enregistrer la carte')}
        </Button>
      </div>
    </form>
  );
}
