import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { User, Phone, MapPin, History, Globe, ArrowLeft, ShoppingBag, CreditCard, Home, Gift, HelpCircle, Settings, LogOut, ChevronRight, Download, Star, Trash2, Plus, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getOnboarding } from "@/pages/onboarding";
import { isOnboardingEnabled } from "@/lib/onboarding-config";
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
  readonly id: string;
  label: string;
  street: string;
  details?: string;
  isDefault?: boolean;
};

// Fonction pour générer un ID unique
const generateAddressId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback pour les navigateurs plus anciens
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Fonction helper pour la pluralisation des adresses
const formatAddressCount = (count: number, language: string): string => {
  if (language === 'ar') {
    return `${count} عنوان محفوظ`;
  }
  if (language === 'en') {
    return `${count} saved ${count === 1 ? 'address' : 'addresses'}`;
  }
  return `${count} ${count === 1 ? 'adresse sauvegardée' : 'adresses sauvegardées'}`;
};

export default function Profile() {
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const onboardingEnabled = isOnboardingEnabled();
  const [onboardingData] = useState(() => getOnboarding());
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState("");
  const [newAddressStreet, setNewAddressStreet] = useState("");
  const [newAddressDetails, setNewAddressDetails] = useState("");

  // Fonction pour réinitialiser le formulaire d'ajout d'adresse
  const resetNewAddressForm = useCallback(() => {
    setNewAddressLabel("");
    setNewAddressStreet("");
    setNewAddressDetails("");
  }, []);

  // Charger les adresses sauvegardées - optimisé pour ne dépendre que du téléphone
  useEffect(() => {
    if (!onboardingData?.phone) {
      setSavedAddresses([]);
      return;
    }
    
    const saved = localStorage.getItem(`savedAddresses_${onboardingData.phone}`);
    if (saved) {
      try {
        const addresses = JSON.parse(saved) as SavedAddress[];
        setSavedAddresses(addresses);
      } catch (e) {
        console.error("Erreur chargement adresses:", e);
        setSavedAddresses([]);
      }
    } else {
      setSavedAddresses([]);
    }
  }, [onboardingData?.phone]);

  // Recharger les adresses quand le dialog s'ouvre (pour synchronisation)
  useEffect(() => {
    if (showAddressDialog && onboardingData?.phone) {
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
  }, [showAddressDialog, onboardingData?.phone]);

  // Sauvegarder les adresses dans localStorage
  const saveAddressesToStorage = useCallback((addresses: SavedAddress[]) => {
    if (onboardingData?.phone) {
      localStorage.setItem(`savedAddresses_${onboardingData.phone}`, JSON.stringify(addresses));
    }
  }, [onboardingData?.phone]);

  const handleSetDefault = useCallback((id: string) => {
    const updated = savedAddresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    setSavedAddresses(updated);
    saveAddressesToStorage(updated);
    toast({ 
      title: t('profile.address.defaultUpdated') || (language === 'ar' ? "تم تحديث العنوان الافتراضي" : language === 'en' ? "Default address updated" : "Adresse par défaut mise à jour")
    });
  }, [savedAddresses, saveAddressesToStorage, toast, t, language]);

  const handleDeleteAddress = useCallback((id: string) => {
    if (savedAddresses.length <= 1) {
      toast({ 
        title: t('profile.address.error') || (language === 'ar' ? "خطأ" : language === 'en' ? "Error" : "Erreur"), 
        description: t('profile.address.minOneRequired') || (language === 'ar' ? "يجب أن يكون لديك عنوان واحد على الأقل" : language === 'en' ? "You must have at least one address" : "Vous devez avoir au moins une adresse"), 
        variant: "destructive" 
      });
      return;
    }
    const updated = savedAddresses.filter(addr => addr.id !== id);
    setSavedAddresses(updated);
    saveAddressesToStorage(updated);
    toast({ 
      title: t('profile.address.deleted') || (language === 'ar' ? "تم حذف العنوان" : language === 'en' ? "Address deleted" : "Adresse supprimée")
    });
  }, [savedAddresses, saveAddressesToStorage, toast, t, language]);

  const handleSaveAddress = useCallback(() => {
    const trimmedStreet = newAddressStreet.trim();
    
    // Validation de longueur
    if (!trimmedStreet || trimmedStreet.length < 5) {
      toast({ 
        title: t('profile.address.error') || (language === 'ar' ? "خطأ" : language === 'en' ? "Error" : "Erreur"), 
        description: t('profile.address.minLength') || (language === 'ar' ? "يجب أن يحتوي العنوان على 5 أحرف على الأقل" : language === 'en' ? "Address must be at least 5 characters" : "L'adresse doit contenir au moins 5 caractères"), 
        variant: "destructive" 
      });
      return;
    }

    // Vérification des doublons
    const isDuplicate = savedAddresses.some(
      addr => addr.street.trim().toLowerCase() === trimmedStreet.toLowerCase()
    );
    
    if (isDuplicate) {
      toast({ 
        title: t('profile.address.error') || (language === 'ar' ? "خطأ" : language === 'en' ? "Error" : "Erreur"), 
        description: t('profile.address.duplicate') || (language === 'ar' ? "هذا العنوان موجود بالفعل" : language === 'en' ? "This address already exists" : "Cette adresse existe déjà"), 
        variant: "destructive" 
      });
      return;
    }

    const newAddress: SavedAddress = {
      id: generateAddressId(),
      label: newAddressLabel.trim() || (language === 'ar' ? "آخر" : language === 'en' ? "Other" : "Autre"),
      street: trimmedStreet,
      details: newAddressDetails.trim() || undefined,
      isDefault: savedAddresses.length === 0,
    };

    const updated = [...savedAddresses, newAddress];
    setSavedAddresses(updated);
    saveAddressesToStorage(updated);
    
    resetNewAddressForm();
    setShowAddForm(false);
    
    toast({ 
      title: t('profile.address.saved') || (language === 'ar' ? "تم حفظ العنوان" : language === 'en' ? "Address saved" : "Adresse sauvegardée"), 
      description: t('profile.address.savedDesc') || (language === 'ar' ? "سيكون هذا العنوان متاحًا لطلباتك القادمة" : language === 'en' ? "This address will be available for your next orders" : "Cette adresse sera disponible pour vos prochaines commandes")
    });
  }, [newAddressStreet, newAddressLabel, newAddressDetails, savedAddresses, language, saveAddressesToStorage, resetNewAddressForm, toast, t]);

  // Mémoïsation du nombre d'adresses formaté
  const addressCountText = useMemo(() => {
    if (savedAddresses.length > 0) {
      return formatAddressCount(savedAddresses.length, language);
    }
    return onboardingData?.address || (language === 'ar' ? 'لا توجد عناوين محفوظة' : language === 'en' ? 'No saved addresses' : 'Aucune adresse enregistrée');
  }, [savedAddresses.length, language, onboardingData?.address]);

  // Afficher le message d'erreur seulement si l'onboarding est activé ET qu'il n'y a pas de données
  if (!onboardingData && onboardingEnabled) {
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
  const getInitials = useCallback((name: string | undefined) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header vert */}
      <div className="bg-primary text-primary-foreground sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 md:hidden"
            aria-label={t('common.back') || "Retour"}
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold flex-1">{t('profile.title')}</h1>
          <Link href="/cart">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              aria-label={t('nav.cart') || "Panier"}
            >
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
              <span className="text-2xl font-bold text-primary">{getInitials(onboardingData?.name)}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{onboardingData?.name || t('profile.guest') || "Invité"}</h2>
              {onboardingData?.phone && (
                <p className="text-sm text-muted-foreground">{onboardingData.phone}</p>
              )}
              {onboardingData?.address && (
                <p className="text-xs text-muted-foreground mt-1">{onboardingData.address}</p>
              )}
            </div>
          </div>
          
          {/* Badge membre (optionnel - peut être ajouté plus tard) */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary">★</span>
            <span className="font-medium">{t('profile.member') || "Membre"}</span>
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
                <p className="font-semibold">{t('profile.paymentMethods') || "Méthodes de paiement"}</p>
                <p className="text-xs text-muted-foreground">{t('profile.paymentMethods.desc') || "Gérer vos moyens de paiement"}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div 
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b"
            onClick={() => setShowAddressDialog(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowAddressDialog(true);
              }
            }}
            aria-label={t('profile.actions.addresses') || (language === 'ar' ? "العناوين" : language === 'en' ? "Addresses" : "Adresses")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {t('profile.actions.addresses') || (language === 'ar' ? "العناوين" : language === 'en' ? "Addresses" : "Adresses")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {addressCountText}
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
                <p className="font-semibold">{t('profile.giftCards') || "Cartes cadeaux & crédits"}</p>
                <p className="text-xs text-muted-foreground">{t('profile.giftCards.desc') || "Gérer vos crédits"}</p>
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
                <p className="font-semibold">{t('profile.helpCenter') || "Centre d'aide"}</p>
                <p className="text-xs text-muted-foreground">{t('profile.helpCenter.desc') || "FAQ et support"}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Bouton Inviter des amis */}
        <Button className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold">
          {t('profile.inviteFriends') || "Inviter des amis - Obtenez 10€ de réduction"}
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
              aria-label={language === 'fr' ? `${t('profile.actions.language')} - Français (sélectionné)` : `${t('profile.actions.language')} - Français`}
            >
              Français {language === 'fr' && '✓'}
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
              className="w-full justify-start"
              onClick={() => setLanguage('en')}
              aria-label={language === 'en' ? `${t('profile.actions.language')} - English (selected)` : `${t('profile.actions.language')} - English`}
            >
              English {language === 'en' && '✓'}
            </Button>
            <Button
              variant={language === 'ar' ? 'default' : 'outline'}
              size="sm"
              className="w-full justify-start font-sans"
              onClick={() => setLanguage('ar')}
              aria-label={language === 'ar' ? `${t('profile.actions.language')} - العربية (محدد)` : `${t('profile.actions.language')} - العربية`}
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
              {t('profile.settings') || "Paramètres"}
            </Button>
          </Link>
          <Button variant="ghost" className="text-primary hover:bg-primary/10">
            <LogOut className="h-4 w-4 mr-2" />
            {t('profile.logout') || "Déconnexion"}
          </Button>
        </div>
      </div>

      {/* Dialog de gestion des adresses */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" role="dialog" aria-modal="true">
          <DialogHeader>
            <DialogTitle>
              {t('profile.address.manage') || (language === 'ar' ? "إدارة العناوين" : language === 'en' ? "Manage Addresses" : "Gérer les adresses")}
            </DialogTitle>
            <DialogDescription>
              {t('profile.address.manageDesc') || (language === 'ar' ? "إضافة أو تعديل أو حذف عناوينك المحفوظة" : language === 'en' ? "Add, edit or delete your saved addresses" : "Ajouter, modifier ou supprimer vos adresses sauvegardées")}
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
                              {t('profile.address.default') || (language === 'ar' ? "افتراضي" : language === 'en' ? "Default" : "Par défaut")}
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
                            aria-label={t('profile.address.setDefault') || (language === 'ar' ? "تعيين كافتراضي" : language === 'en' ? "Set as default" : "Définir par défaut")}
                            title={t('profile.address.setDefault') || (language === 'ar' ? "تعيين كافتراضي" : language === 'en' ? "Set as default" : "Définir par défaut")}
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
                            aria-label={`${t('profile.address.delete') || (language === 'ar' ? "حذف" : language === 'en' ? "Delete" : "Supprimer")} ${addr.label}`}
                            title={t('profile.address.delete') || (language === 'ar' ? "حذف" : language === 'en' ? "Delete" : "Supprimer")}
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
                <p>{t('profile.address.none') || (language === 'ar' ? "لا توجد عناوين محفوظة" : language === 'en' ? "No saved addresses" : "Aucune adresse sauvegardée")}</p>
              </div>
            )}

            {/* Formulaire d'ajout */}
            {showAddForm ? (
              <Card className="p-4 bg-muted/50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-semibold">
                      {t('profile.address.addNew') || (language === 'ar' ? "إضافة عنوان جديد" : language === 'en' ? "Add New Address" : "Ajouter une nouvelle adresse")}
                    </Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setShowAddForm(false);
                        resetNewAddressForm();
                      }}
                      aria-label={t('common.cancel') || "Annuler"}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address-label" className="sr-only">
                      {t('profile.address.label') || (language === 'ar' ? "الاسم" : language === 'en' ? "Label" : "Nom")}
                    </Label>
                    <Input
                      id="address-label"
                      placeholder={t('profile.address.labelPlaceholder') || (language === 'ar' ? "الاسم (مثل: منزل، عمل)" : language === 'en' ? "Label (e.g., Home, Work)" : "Nom (ex: Domicile, Travail)")}
                      value={newAddressLabel}
                      onChange={(e) => setNewAddressLabel(e.target.value)}
                      aria-label={t('profile.address.label') || (language === 'ar' ? "الاسم" : language === 'en' ? "Label" : "Nom")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address-street" className="sr-only">
                      {t('profile.address.street') || (language === 'ar' ? "العنوان" : language === 'en' ? "Address" : "Adresse")}
                    </Label>
                    <Input
                      id="address-street"
                      placeholder={t('profile.address.streetPlaceholder') || (language === 'ar' ? "العنوان الكامل" : language === 'en' ? "Full address" : "Adresse complète")}
                      value={newAddressStreet}
                      onChange={(e) => setNewAddressStreet(e.target.value)}
                      aria-label={t('profile.address.street') || (language === 'ar' ? "العنوان" : language === 'en' ? "Address" : "Adresse")}
                      aria-required="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address-details" className="sr-only">
                      {t('profile.address.details') || (language === 'ar' ? "التفاصيل" : language === 'en' ? "Details" : "Détails")}
                    </Label>
                    <Input
                      id="address-details"
                      placeholder={t('profile.address.detailsPlaceholder') || (language === 'ar' ? "تفاصيل إضافية (اختياري)" : language === 'en' ? "Additional details (optional)" : "Détails supplémentaires (optionnel)")}
                      value={newAddressDetails}
                      onChange={(e) => setNewAddressDetails(e.target.value)}
                      aria-label={t('profile.address.details') || (language === 'ar' ? "التفاصيل" : language === 'en' ? "Details" : "Détails")}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveAddress} 
                    className="w-full"
                    aria-label={t('profile.address.save') || (language === 'ar' ? "حفظ العنوان" : language === 'en' ? "Save Address" : "Enregistrer l'adresse")}
                  >
                    {t('profile.address.save') || (language === 'ar' ? "حفظ العنوان" : language === 'en' ? "Save Address" : "Enregistrer l'adresse")}
                  </Button>
                </div>
              </Card>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowAddForm(true)}
                className="w-full"
                aria-label={t('profile.address.addNew') || (language === 'ar' ? "إضافة عنوان جديد" : language === 'en' ? "Add New Address" : "Ajouter une nouvelle adresse")}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('profile.address.addNew') || (language === 'ar' ? "إضافة عنوان جديد" : language === 'en' ? "Add New Address" : "Ajouter une nouvelle adresse")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
