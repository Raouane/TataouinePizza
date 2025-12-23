import { useState } from "react";
import { Link } from "wouter";
import { User, Phone, MapPin, History, Globe, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getOnboarding } from "@/pages/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Profile() {
  const { t, language, setLanguage } = useLanguage();
  const [onboardingData] = useState(() => getOnboarding());

  if (!onboardingData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{t('profile.notFound.title')}</CardTitle>
            <CardDescription>{t('profile.notFound.desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/onboarding">
              <Button className="w-full">{t('profile.notFound.action')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b md:static md:border-0 mb-6">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">{t('profile.title')}</h1>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 space-y-6">
        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{onboardingData.name}</CardTitle>
                <CardDescription>{t('profile.subtitle')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phone */}
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{t('profile.phone')}</p>
                <p className="text-base">{onboardingData.phone}</p>
              </div>
            </div>

            {/* Address */}
            {onboardingData.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{t('profile.address')}</p>
                  <p className="text-base">{onboardingData.address}</p>
                </div>
              </div>
            )}

            {/* Coordinates (if available) */}
            {onboardingData.lat && onboardingData.lng && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{t('profile.location')}</p>
                  <p className="text-xs text-muted-foreground">
                    {onboardingData.lat.toFixed(6)}, {onboardingData.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Order History */}
          <Link href="/history">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <History className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{t('profile.actions.history')}</h3>
                    <p className="text-sm text-muted-foreground">{t('profile.actions.history.desc')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Language Settings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{t('profile.actions.language')}</h3>
                  <p className="text-sm text-muted-foreground">{t('profile.actions.language.desc')}</p>
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
            </CardContent>
          </Card>
        </div>

        {/* Edit Profile */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{t('profile.edit.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('profile.edit.desc')}</p>
              </div>
              <Link href="/onboarding">
                <Button variant="outline">{t('profile.edit.button')}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

