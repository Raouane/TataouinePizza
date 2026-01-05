import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RefreshCw, Menu, Settings, BarChart3, Store, Bike, Pizza as PizzaIcon, ShoppingCart, LogOut, Database } from "lucide-react";

interface AdminHeaderProps {
  activeTab: string;
  totalOrders: number;
  onRefresh: () => void;
  onSetActiveTab: (tab: string) => void;
  onShowStats: () => void;
  onLogout: () => void;
  showMenu: boolean;
  onSetShowMenu: (show: boolean) => void;
  onMigrate?: () => void;
}

export function AdminHeader({
  activeTab,
  totalOrders,
  onRefresh,
  onSetActiveTab,
  onShowStats,
  onLogout,
  showMenu,
  onSetShowMenu,
  onMigrate,
}: AdminHeaderProps) {
  return (
    <div className="border-b bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <div className="flex justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-serif font-bold truncate">Espace Admin</h1>
            <p className="text-xs md:text-sm text-muted-foreground truncate">Supervision générale</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onRefresh} className="px-2 md:px-3">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Sheet open={showMenu} onOpenChange={onSetShowMenu}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="px-2 md:px-3">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Menu Admin
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {/* Statistiques */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={() => {
                      onShowStats();
                      onSetShowMenu(false);
                    }}
                  >
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Statistiques</p>
                      <p className="text-xs text-muted-foreground">Vue d'ensemble</p>
                    </div>
                  </Button>

                  {/* Gestion */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <p className="font-medium text-sm mb-2">Gestion</p>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 h-auto py-2"
                      onClick={() => {
                        onSetActiveTab("restaurants");
                        onSetShowMenu(false);
                      }}
                    >
                      <Store className="w-4 h-4" />
                      <span>Restaurants</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 h-auto py-2"
                      onClick={() => {
                        onSetActiveTab("drivers");
                        onSetShowMenu(false);
                      }}
                    >
                      <Bike className="w-4 h-4" />
                      <span>Livreurs</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 h-auto py-2"
                      onClick={() => {
                        onSetActiveTab("pizzas");
                        onSetShowMenu(false);
                      }}
                    >
                      <PizzaIcon className="w-4 h-4" />
                      <span>Produits</span>
                    </Button>
                  </div>

                  {/* Commandes */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={() => {
                      onSetActiveTab("orders");
                      onSetShowMenu(false);
                    }}
                  >
                    <div className="bg-green-100 p-2 rounded-lg">
                      <ShoppingCart className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Commandes</p>
                      <p className="text-xs text-muted-foreground">{totalOrders} commande{totalOrders > 1 ? 's' : ''}</p>
                    </div>
                  </Button>

                  {/* Migration (temporaire) */}
                  {onMigrate && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-3 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      onClick={() => {
                        onMigrate();
                        onSetShowMenu(false);
                      }}
                    >
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <Database className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Migration DB</p>
                        <p className="text-xs text-muted-foreground">Render → Supabase</p>
                      </div>
                    </Button>
                  )}

                  {/* Déconnexion */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto py-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      onLogout();
                      onSetShowMenu(false);
                    }}
                  >
                    <div className="bg-red-100 p-2 rounded-lg">
                      <LogOut className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Déconnexion</p>
                      <p className="text-xs text-muted-foreground">Quitter l'application</p>
                    </div>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}

