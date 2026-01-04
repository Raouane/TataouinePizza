import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Smartphone, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface FlouciInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FlouciInfoDialog({ open, onOpenChange }: FlouciInfoDialogProps) {
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" role="dialog" aria-modal="true">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' 
              ? 'الدفع المحلي TND (Flouci)' 
              : language === 'en' 
              ? 'Local Payment TND (Flouci)' 
              : 'Paiement Local TND (Flouci)'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'معلومات حول الدفع عبر Flouci' 
              : language === 'en' 
              ? 'Information about Flouci payment' 
              : 'Informations sur le paiement Flouci'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Explication principale */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold mb-1">
                  {language === 'ar' 
                    ? 'بطاقات تونسية' 
                    : language === 'en' 
                    ? 'Tunisian Cards' 
                    : 'Cartes tunisiennes'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? 'يمكنك الدفع باستخدام بطاقتك البنكية التونسية (دينار تونسي) عند إتمام الطلب.' 
                    : language === 'en' 
                    ? 'You can pay using your Tunisian bank card (TND) when completing your order.' 
                    : 'Vous pouvez payer avec votre carte bancaire tunisienne (TND) lors de la finalisation de votre commande.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold mb-1">
                  {language === 'ar' 
                    ? 'التطبيق Flouci' 
                    : language === 'en' 
                    ? 'Flouci App' 
                    : 'Application Flouci'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? 'سيتم توجيهك إلى تطبيق Flouci أو صفحة الدفع الآمنة لإتمام عملية الدفع.' 
                    : language === 'en' 
                    ? 'You will be redirected to the Flouci app or secure payment page to complete the payment.' 
                    : 'Vous serez redirigé vers l\'application Flouci ou la page de paiement sécurisée pour finaliser le paiement.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold mb-1">
                  {language === 'ar' 
                    ? 'مخصص للسوق المحلي' 
                    : language === 'en' 
                    ? 'For Local Market' 
                    : 'Pour le marché local'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' 
                    ? 'هذه الطريقة مثالية للعملاء التونسيين الذين يمتلكون بطاقات بنكية محلية.' 
                    : language === 'en' 
                    ? 'This method is ideal for Tunisian customers with local bank cards.' 
                    : 'Cette méthode est idéale pour les clients tunisiens possédant des cartes bancaires locales.'}
                </p>
              </div>
            </div>
          </div>

          {/* Note importante */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm">
              {language === 'ar' 
                ? '💡 ملاحظة: سيتم تفعيل خيار الدفع عبر Flouci عند إتمام الطلب. لا حاجة لإضافة بطاقة مسبقاً.' 
                : language === 'en' 
                ? '💡 Note: The Flouci payment option will be available when completing your order. No need to add a card in advance.' 
                : '💡 Note : L\'option de paiement Flouci sera disponible lors de la finalisation de votre commande. Aucun besoin d\'ajouter une carte à l\'avance.'}
            </p>
          </div>

          {/* Bouton de fermeture */}
          <div className="flex justify-end pt-2">
            <Button onClick={() => onOpenChange(false)}>
              {language === 'ar' ? 'حسناً' : language === 'en' ? 'OK' : 'D\'accord'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
