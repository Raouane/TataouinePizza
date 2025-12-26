import { Link, useLocation } from "wouter";
import { ShoppingBag, Home, Pizza, Menu as MenuIcon, Globe, User } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GlobalTrackerWidget } from "@/components/global-tracker";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  // Ne pas afficher le tracker global sur la page de succès (elle a son propre suivi)
  const showGlobalTracker = !location.startsWith('/success');
  const { count } = useCart();
  const { t, language, setLanguage, dir } = useLanguage();

  const navItems = [
    { href: "/", icon: Home, label: t('nav.home') },
    { href: "/profile", icon: User, label: t('nav.profile') },
    { href: "/cart", icon: ShoppingBag, label: t('nav.cart'), badge: count },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 font-sans text-foreground selection:bg-primary selection:text-primary-foreground" dir={dir}>
      {/* Desktop/Tablet Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary text-primary-foreground p-1 rounded-md group-hover:rotate-12 transition-transform">
              <Pizza className="h-6 w-6" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">
              Tataouine<span className="text-primary">Pizza</span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  data-cart-icon={item.href === "/cart" ? "true" : undefined}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                    location === item.href
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

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur px-3 py-2 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <nav className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
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
