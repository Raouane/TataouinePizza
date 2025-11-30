import { Link, useLocation } from "wouter";
import { ShoppingBag, Home, Pizza, Menu as MenuIcon, Globe, History, Shield } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GlobalTrackerWidget } from "@/components/global-tracker";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { count } = useCart();
  const { t, language, setLanguage, dir } = useLanguage();

  const navItems = [
    { href: "/", icon: Home, label: t('nav.home') },
    { href: "/menu", icon: Pizza, label: t('nav.menu') },
    { href: "/history", icon: History, label: "Historique" },
    { href: "/cart", icon: ShoppingBag, label: t('nav.cart'), badge: count },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 font-sans text-foreground selection:bg-primary selection:text-primary-foreground" dir={dir}>
      {/* Desktop/Tablet Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <Link href="/">
            <a className="flex items-center gap-2 group">
              <div className="bg-primary text-primary-foreground p-1 rounded-md group-hover:rotate-12 transition-transform">
                <Pizza className="h-6 w-6" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight">
                Tataouine<span className="text-primary">Pizza</span>
              </span>
            </a>
          </Link>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                      location === item.href
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                    {item.badge ? (
                      <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                        {item.badge}
                      </span>
                    ) : null}
                  </a>
                </Link>
              ))}
            </nav>

            <Link href="/admin/login">
              <Button variant="outline" size="sm" className="gap-2 hidden md:flex">
                <Shield className="w-4 h-4" />
                Admin
              </Button>
            </Link>

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

      {/* Global Order Tracker Widget */}
      <GlobalTrackerWidget />

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur px-6 py-3 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <nav className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all duration-300",
                    isActive ? "text-primary scale-110" : "text-muted-foreground"
                  )}
                >
                  <div className="relative">
                    <item.icon
                      className={cn("h-6 w-6", isActive && "fill-current/20")}
                    />
                    {item.badge && item.badge > 0 ? (
                      <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full animate-in zoom-in">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
