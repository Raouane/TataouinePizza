import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";

// Les titres des modes de livraison sont maintenant dans i18n.tsx
const deliveryModes: Record<string, { image: string; color: string }> = {
  scooter: {
    image: "/images/products/delivery/delivery-scooter.png",
    color: "bg-yellow-500"
  },
  "tuk-tuk": {
    image: "/images/products/delivery/delivery-tuktuk.png",
    color: "bg-red-500"
  },
  truck: {
    image: "/images/products/delivery/delivery-truck.png",
    color: "bg-blue-500"
  },
  tractor: {
    image: "/images/products/delivery/tracteur.png",
    color: "bg-green-500"
  }
};

const getDeliveryModeTitle = (modeId: string, t: (key: string) => string): string => {
  const titles: Record<string, string> = {
    scooter: t('delivery.mode.scooter.title'),
    "tuk-tuk": t('delivery.mode.tuktuk.title'),
    truck: t('delivery.mode.truck.title'),
    tractor: t('delivery.mode.tractor.title')
  };
  return titles[modeId] || titles.scooter;
};

export default function DeliveryFormStep3() {
  const [, setLocation] = useLocation();
  const { t, language, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  // Récupérer le mode de livraison depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const modeId = params.get("mode") || "scooter";
  const deliveryMode = deliveryModes[modeId] || deliveryModes.scooter;
  const deliveryModeTitle = getDeliveryModeTitle(modeId, t);

  const [packageDescription, setPackageDescription] = useState("");
  const [formData, setFormData] = useState<any>(null);

  // Charger les données des étapes précédentes
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("delivery_form_data");
      if (savedData) {
        const data = JSON.parse(savedData);
        setFormData(data);
      }
    } catch (e) {
      console.error("Error loading form data:", e);
    }
  }, []);

  const handleConfirm = () => {
    if (!formData) {
      alert(t('delivery.step3.error.missing'));
      setLocation("/");
      return;
    }

    // Ajouter la description du colis
    const finalData = {
      ...formData,
      packageDescription: packageDescription.trim(),
      deliveryModeTitle: deliveryModeTitle
    };

    localStorage.setItem("delivery_form_data", JSON.stringify(finalData));

    // Rediriger vers la page du professionnel
    setLocation(`/delivery-professional?mode=${modeId}`);
  };

  // Calculer le total estimé (exemple)
  const estimatedTotal = `1,500 ${t('common.currency')}`;

  if (!formData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">{t('delivery.step3.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" dir={dir}>
      {/* Header avec progression */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/delivery-form-step2?mode=${modeId}`)}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              {/* Barre de progression - toutes les étapes complétées */}
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 flex-1 rounded-full bg-orange-500"></div>
                <div className="h-1.5 flex-1 rounded-full bg-orange-500"></div>
                <div className="h-1.5 flex-1 rounded-full bg-orange-500"></div>
              </div>
              <p className="text-xs text-gray-500">{t('delivery.step', { step: '3' })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Illustration et titre */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-20 h-20 rounded-lg ${deliveryMode.color} flex items-center justify-center overflow-hidden flex-shrink-0`}>
            <img 
              src={deliveryMode.image} 
              alt={deliveryModeTitle}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.className = `w-20 h-20 rounded-lg ${deliveryMode.color} flex items-center justify-center`;
                    parent.innerHTML = `<div class="text-white text-2xl">🛵</div>`;
                }
              }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{deliveryModeTitle}</h1>
            <p className="text-sm text-gray-500">{t('delivery.step', { step: '3' })}</p>
          </div>
        </div>

        {/* Description du colis */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('delivery.step3.package.title')}
          </h2>
          <div className="relative">
            <Package className={`absolute top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 ${isRtl ? 'right-3' : 'left-3'}`} />
            <Input
              type="text"
              placeholder={t('delivery.step3.package.placeholder')}
              value={packageDescription}
              onChange={(e) => setPackageDescription(e.target.value)}
              className={`h-12 text-base ${isRtl ? 'pr-11' : 'pl-11'}`}
            />
          </div>
        </div>

        {/* Récapitulatif */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('delivery.step3.summary.title')}
          </h2>
          <Card className="p-4">
            <CardContent className="space-y-3 p-0">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('delivery.step3.summary.type')}</span>
                <span className="font-medium text-gray-900">{deliveryModeTitle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('delivery.step3.summary.pickup')}</span>
                <span className="font-medium text-gray-900">{formData.pickupAddress || t('delivery.step3.summary.notSpecified')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('delivery.step3.summary.delivery')}</span>
                <span className="font-medium text-gray-900">{formData.deliveryAddress || t('delivery.step3.summary.notSpecified')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t('delivery.step3.summary.recipient')}</span>
                <span className="font-medium text-gray-900">{formData.name || t('delivery.step3.summary.notSpecified')}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('delivery.step3.summary.total')}</span>
                  <span className="text-xl font-bold text-orange-500">{estimatedTotal}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation(`/delivery-form-step2?mode=${modeId}`)}
            className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-50 py-6"
          >
            <ArrowLeft className={`${isRtl ? 'ml-2 rotate-180' : 'mr-2'} h-5 w-5`} />
            {t('delivery.step3.back')}
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-white text-gray-900 hover:bg-gray-50 border border-gray-300 py-6 font-semibold"
          >
            {t('delivery.step3.confirm')}
            <ChevronRight className={`${isRtl ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
