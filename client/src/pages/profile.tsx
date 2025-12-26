import { useState } from "react";
import { Link } from "wouter";
import { User, Phone, MapPin, History, Globe, ArrowLeft, ShoppingBag, CreditCard, Home, Gift, HelpCircle, Settings, LogOut, ChevronRight, Download } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getOnboarding } from "@/pages/onboarding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Profile() {
  const { t, language, setLanguage } = useLanguage();
  const [onboardingData] = useState(() => getOnboarding());

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
  const getInitials = (name: string) => {
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

          <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Adresses</p>
                <p className="text-xs text-muted-foreground">{onboardingData.address || 'Aucune adresse enregistrée'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">♡</span>
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
    </div>
  );
}

