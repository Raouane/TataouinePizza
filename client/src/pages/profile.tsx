import { useState, useEffect } from "react";
import { Link } from "wouter";
import { User, Phone, MapPin, History, Globe, ArrowLeft, ShoppingBag, CreditCard, Home, Gift, HelpCircle, Settings, LogOut, ChevronRight, Download, Star, Trash2, Plus, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getOnboarding } from "@/pages/onboarding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type SavedAddress = {
  id: string;
  label: string;
  street: string;
  details?: string;
  isDefault?: boolean;
};

export default function Profile() {
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [onboardingData] = useState(() => getOnboarding());
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState("");
  const [newAddressStreet, setNewAddressStreet] = useState("");
  const [newAddressDetails, setNewAddressDetails] = useState("");

  // Charger les adresses sauvegardées
  useEffect(() => {
    if (onboardingData?.phone) {
      const saved = localStorage.getItem(`savedAddresses_${onboardingData.phone}`);
      if (saved) {
        try {
          const addresses = JSON.parse(saved) as SavedAddress[];
          setSavedAddresses(addresses);
        } catch (e) {
          console.error("Erreur chargement adresses:", e);
        }
      }
    }
  }, [onboardingData?.phone, showAddressDialog]);

  const handleSetDefault = (id: string) => {
    const updated = savedAddresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    setSavedAddresses(updated);
    if (onboardingData?.phone) {
      localStorage.setItem(`savedAddresses_${onboardingData.phone}`, JSON.stringify(updated));
    }
    toast({ 
      title: language === 'ar' ? "تم تحديث العنوان الافتراضي" : language === 'en' ? "Default address updated" : "Adresse par défaut mise à jour" 
    });
  };

  const handleDeleteAddress = (id: string) => {
    if (savedAddresses.length <= 1) {
      toast({ 
        title: language === 'ar' ? "خطأ" : language === 'en' ? "Error" : "Erreur", 
        description: language === 'ar' ? "يجب أن يكون لديك عنوان واحد على الأقل" : language === 'en' ? "You must have at least one address" : "Vous devez avoir au moins une adresse", 
        variant: "destructive" 
      });
      return;
    }
    const updated = savedAddresses.filter(addr => addr.id !== id);
    setSavedAddresses(updated);
    if (onboardingData?.phone) {
      localStorage.setItem(`savedAddresses_${onboardingData.phone}`, JSON.stringify(updated));
    }
    toast({ 
      title: language === 'ar' ? "تم حذف العنوان" : language === 'en' ? "Address deleted" : "Adresse supprimée" 
    });
  };

  const handleSaveAddress = () => {
    if (!newAddressStreet.trim() || newAddressStreet.trim().length < 5) {
      toast({ 
        title: language === 'ar' ? "خطأ" : language === 'en' ? "Error" : "Erreur", 
        description: language === 'ar' ? "يجب أن يحتوي العنوان على 5 أحرف على الأقل" : language === 'en' ? "Address must be at least 5 characters" : "L'adresse doit contenir au moins 5 caractères", 
        variant: "destructive" 
      });
      return;
    }

    const newAddress: SavedAddress = {
      id: Date.now().toString(),
      label: newAddressLabel.trim() || (language === 'ar' ? "آخر" : language === 'en' ? "Other" : "Autre"),
      street: newAddressStreet.trim(),
      details: newAddressDetails.trim() || undefined,
      isDefault: savedAddresses.length === 0,
    };

    const updated = [...savedAddresses, newAddress];
    setSavedAddresses(updated);
    if (onboardingData?.phone) {
      localStorage.setItem(`savedAddresses_${onboardingData.phone}`, JSON.stringify(updated));
    }
    
    setNewAddressLabel("");
    setNewAddressStreet("");
    setNewAddressDetails("");
    setShowAddForm(false);
    
    toast({ 
      title: language === 'ar' ? "تم حفظ العنوان" : language === 'en' ? "Address saved" : "Adresse sauvegardée", 
      description: language === 'ar' ? "سيكون هذا العنوان متاحًا لطلباتك القادمة" : language === 'en' ? "This address will be available for your next orders" : "Cette adresse sera disponible pour vos prochaines commandes" 
    });
  };

  if (!onboardingData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">{t('profile.notFound.title')}</h2>
            <p className="text-muted-foreground mb-4">{t('profile.notFound.desc')}</p>
            <Link href="/onboarding">
              <Button className="w-full">{t('profile.notFound.action')}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Générer les initiales pour l'avatar
  const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header vert */}
      <div className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold flex-1">{t('profile.title')}</h1>
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <ShoppingBag className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Section Informations utilisateur */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{getInitials(onboardingData.name)}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{onboardingData.name}</h2>
              <p className="text-sm text-muted-foreground">{onboardingData.phone}</p>
              {onboardingData.address && (
                <p className="text-xs text-muted-foreground mt-1">{onboardingData.address}</p>
              )}
            </div>
          </div>
          
          {/* Badge membre (optionnel - peut être ajouté plus tard) */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary">★</span>
            <span className="font-medium">Membre</span>
          </div>
        </Card>

        {/* Menu de navigation */}
        <Card className="p-0 overflow-hidden">
          <Link href="/history">
            <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{t('profile.actions.history')}</p>
                  <p className="text-xs text-muted-foreground">{t('profile.actions.history.desc')}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>

          <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Méthodes de paiement</p>
                <p className="text-xs text-muted-foreground">Gérer vos moyens de paiement</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div 
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b"
            onClick={() => setShowAddressDialog(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {language === 'ar' ? "العناوين" : language === 'en' ? "Addresses" : "Adresses"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {savedAddresses.length > 0 
                    ? `${savedAddresses.length} ${language === 'ar' ? 'عنوان محفوظ' : language === 'en' ? 'saved address' : savedAddresses.length === 1 ? 'adresse sauvegardée' : 'adresses sauvegardées'}`
                    : (onboardingData.address || (language === 'ar' ? 'لا توجد عناوين محفوظة' : language === 'en' ? 'No saved addresses' : 'Aucune adresse enregistrée'))
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Cartes cadeaux & crédits</p>
                <p className="text-xs text-muted-foreground">Gérer vos crédits</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">?</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Centre d'aide</p>
                <p className="text-xs text-muted-foreground">FAQ et support</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Bouton Inviter des amis */}
        <Button className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold">
          Inviter des amis - Obtenez 10€ de réduction
        </Button>

        {/* Langue */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">{t('profile.actions.language')}</p>
              <p className="text-xs text-muted-foreground">{t('profile.actions.language.desc')}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Button
              variant={language === 'fr' ? 'default' : 'outline'}
              size="sm"
              className="w-full justify-start"
              onClick={() => setLanguage('fr')}
            >
              Français {language === 'fr' && '✓'}
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
              className="w-full justify-start"
              onClick={() => setLanguage('en')}
            >
              English {language === 'en' && '✓'}
            </Button>
            <Button
              variant={language === 'ar' ? 'default' : 'outline'}
              size="sm"
              className="w-full justify-start font-sans"
              onClick={() => setLanguage('ar')}
            >
              العربية {language === 'ar' && '✓'}
            </Button>
          </div>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-primary pt-4">
          <Link href="/onboarding">
            <Button variant="ghost" className="text-primary hover:bg-primary/10">
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Button>
          </Link>
          <Button variant="ghost" className="text-primary hover:bg-primary/10">
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Dialog de gestion des adresses */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? "إدارة العناوين" : language === 'en' ? "Manage Addresses" : "Gérer les adresses"}
            </DialogTitle>
            <DialogDescription>
              {language === 'ar' ? "إضافة أو تعديل أو حذف عناوينك المحفوظة" : language === 'en' ? "Add, edit or delete your saved addresses" : "Ajouter, modifier ou supprimer vos adresses sauvegardées"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Liste des adresses */}
            {savedAddresses.length > 0 ? (
              <div className="space-y-3">
                {savedAddresses.map((addr) => (
                  <Card key={addr.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{addr.label}</span>
                          {addr.isDefault && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {language === 'ar' ? "افتراضي" : language === 'en' ? "Default" : "Par défaut"}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{addr.street}</p>
                        {addr.details && (
                          <p className="text-xs text-gray-500">{addr.details}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!addr.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSetDefault(addr.id)}
                            title={language === 'ar' ? "تعيين كافتراضي" : language === 'en' ? "Set as default" : "Définir par défaut"}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        {savedAddresses.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteAddress(addr.id)}
                            title={language === 'ar' ? "حذف" : language === 'en' ? "Delete" : "Supprimer"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{language === 'ar' ? "لا توجد عناوين محفوظة" : language === 'en' ? "No saved addresses" : "Aucune adresse sauvegardée"}</p>
              </div>
            )}

            {/* Formulaire d'ajout */}
            {showAddForm ? (
              <Card className="p-4 bg-muted/50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-semibold">
                      {language === 'ar' ? "إضافة عنوان جديد" : language === 'en' ? "Add New Address" : "Ajouter une nouvelle adresse"}
                    </Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewAddressLabel("");
                        setNewAddressStreet("");
                        setNewAddressDetails("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder={language === 'ar' ? "الاسم (مثل: منزل، عمل)" : language === 'en' ? "Label (e.g., Home, Work)" : "Nom (ex: Domicile, Travail)"}
                    value={newAddressLabel}
                    onChange={(e) => setNewAddressLabel(e.target.value)}
                  />
                  <Input
                    placeholder={language === 'ar' ? "العنوان الكامل" : language === 'en' ? "Full address" : "Adresse complète"}
                    value={newAddressStreet}
                    onChange={(e) => setNewAddressStreet(e.target.value)}
                  />
                  <Input
                    placeholder={language === 'ar' ? "تفاصيل إضافية (اختياري)" : language === 'en' ? "Additional details (optional)" : "Détails supplémentaires (optionnel)"}
                    value={newAddressDetails}
                    onChange={(e) => setNewAddressDetails(e.target.value)}
                  />
                  <Button onClick={handleSaveAddress} className="w-full">
                    {language === 'ar' ? "حفظ العنوان" : language === 'en' ? "Save Address" : "Enregistrer l'adresse"}
                  </Button>
                </div>
              </Card>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowAddForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' ? "إضافة عنوان جديد" : language === 'en' ? "Add New Address" : "Ajouter une nouvelle adresse"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

