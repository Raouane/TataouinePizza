/**
 * ============================================================================
 * COMPOSANT LAYOUT - NAVIGATION PRINCIPALE DE LA PWA
 * ============================================================================
 * 
 * Ce composant fournit la structure de navigation pour toutes les pages protégées.
 * 
 * UTILISATION DE LA NAVIGATION WOUTER:
 * 
 * 1. IMPORT:
 *    - Link: Composant pour les liens de navigation (équivalent <a> mais sans rechargement)
 *    - useLocation: Hook pour lire la route actuelle et naviguer programmatiquement
 * 
 * 2. LECTURE DE LA ROUTE ACTUELLE:
 *    - const [location] = useLocation();
 *    - Utilisé pour: Détecter la page active, styler les liens actifs, conditionner l'affichage
 * 
 * 3. NAVIGATION DÉCLARATIVE (liens):
 *    - <Link href="/path"> pour créer des liens de navigation
 *    - Avantages: Pas de rechargement de page, transition fluide, compatible PWA
 *    - Utilisé dans: Header desktop, Bottom nav mobile, Footer
 * 
 * STRUCTURE DE NAVIGATION:
 * 
 * A. HEADER (Desktop/Tablet):
 *    - Logo cliquable → <Link href="/"> (navigation vers home)
 *    - Navigation horizontale avec <Link> pour chaque page
 *    - Badge sur le panier avec compteur dynamique
 *    - Menu déroulant pour changement de langue
 * 
 * B. BOTTOM NAV (Mobile uniquement):
 *    - Barre de navigation fixe en bas d'écran
 *    - Icônes avec labels pour chaque page principale
 *    - Indicateur visuel pour la page active
 *    - Badge de notification sur l'icône panier
 * 
 * C. FOOTER:
 *    - Liens vers les espaces admin/livreur/restaurant (utilise <a> pour navigation externe)
 * 
 * PAGES DE NAVIGATION:
 * - / : Accueil (Home)
 * - /profile : Profil utilisateur
 * - /cart : Panier (avec badge de compteur)
 * 
 * LOGIQUE DE NAVIGATION:
 * - location === item.href : Détecte la page active pour le style
 * - Badge dynamique : Affiche le nombre d'articles dans le panier
 * - Responsive : Navigation différente mobile vs desktop
 * 
 * COMPOSANTS INTÉGRÉS:
 * - GlobalTrackerWidget : Widget de suivi de commande (navigation vers /success au clic)
 * - ContactFloatingButton : Bouton de contact flottant
 * - ScrollToTop : Scroll automatique en haut lors des changements de route
 * 
 * ============================================================================
 */

import { Link, useLocation } from "wouter";
import { ShoppingBag, Home, Pizza, Menu as MenuIcon, Globe, User } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GlobalTrackerWidget } from "@/components/global-tracker";
import { ContactFloatingButton } from "@/components/contact-floating-button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation(); // Lecture de la route actuelle via wouter pour détecter la page active
  // Ne pas afficher le tracker global sur la page de succès (elle a son propre suivi)
  const showGlobalTracker = !location.startsWith('/success');
  const { count } = useCart();
  const { t, language, setLanguage, dir } = useLanguage();

  // Définition des éléments de navigation avec leurs routes
  // Chaque item contient: href (route wouter), icône, label, et badge optionnel
  const navItems = [
    { href: "/", icon: Home, label: t('nav.home') }, // Route vers la page d'accueil
    { href: "/profile", icon: User, label: t('nav.profile') }, // Route vers le profil
    { href: "/cart", icon: ShoppingBag, label: t('nav.cart'), badge: count }, // Route vers le panier avec badge dynamique
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 font-sans text-foreground selection:bg-primary selection:text-primary-foreground" dir={dir}>
      {/* Desktop/Tablet Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          {/* Logo cliquable - Navigation vers la page d'accueil via wouter Link */}
          <Link href="/" className="flex items-center gap-2 group">
            <img 
              src="/logo.jpeg" 
              alt="Tataouine Pizza" 
              className="h-10 w-10 rounded-md object-cover group-hover:scale-105 transition-transform"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGOTczMTYiLz4KPHRleHQgeD0iMjAiIHk9IjI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VDwvdGV4dD4KPC9zdmc+';
              }}
            />
            <span className="font-serif text-xl font-bold tracking-tight">
              Tataouine<span className="text-primary">Pizza</span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            {/* Navigation desktop - Utilise wouter Link pour chaque route */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href} // Route wouter pour navigation sans rechargement
                  data-cart-icon={item.href === "/cart" ? "true" : undefined}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                    location === item.href // Détection de la page active via useLocation()
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                  {item.badge ? (
                    <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center animate-in zoom-in">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>


            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('fr')}>
                  Français {language === 'fr' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('en')}>
                  English {language === 'en' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('ar')} className="font-sans">
                  العربية {language === 'ar' && '✓'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 md:px-8 md:py-10 max-w-5xl mx-auto">
        {children}
      </main>

      {/* Global Order Tracker Widget - Masqué sur la page de succès */}
      {showGlobalTracker && <GlobalTrackerWidget />}

      {/* Contact Floating Button - Visible sur toutes les pages */}
      <ContactFloatingButton />

      {/* Mobile Bottom Nav - Navigation mobile avec wouter Link */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur px-3 py-2 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <nav className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = location === item.href; // Détection de la page active via useLocation()
            return (
              <Link 
                key={item.href} 
                href={item.href} // Route wouter pour navigation sans rechargement
                className={cn(
                  "flex flex-col items-center gap-1 transition-all duration-300 p-1",
                  isActive ? "text-primary scale-110" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <item.icon
                    className={cn("h-5 w-5", isActive && "fill-current/20")}
                    data-cart-icon={item.href === "/cart" ? "true" : undefined}
                  />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[8px] font-bold h-3 w-3 flex items-center justify-center rounded-full animate-in zoom-in">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-6 md:py-8 mt-10">
        <div className="container max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="font-serif font-bold text-lg">TataoninePizza</h3>
              <p className="text-sm text-muted-foreground">L'authentique goût du désert</p>
            </div>
            
            <div className="text-center text-xs text-muted-foreground">
              <p>© 2025 Tataouine Pizza. Tous droits réservés.</p>
            </div>

            <div className="text-center md:text-right text-xs space-y-2">
              <div>
                <a href="/restaurant/login" className="text-muted-foreground hover:text-primary transition-colors underline text-xs">
                  Espace Restaurant
                </a>
              </div>
              <div>
                <a href="/driver/login" className="text-muted-foreground hover:text-primary transition-colors underline text-xs">
                  Espace Livreur
                </a>
              </div>
              <div>
                <a href="/admin/login" className="text-muted-foreground hover:text-primary transition-colors underline text-xs">
                  Administration
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
