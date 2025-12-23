import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useLanguage } from "@/lib/i18n";
import { Store } from "lucide-react";

export function CartConfirmDialog() {
  const { restaurants, pendingItem, isConfirmDialogOpen, setIsConfirmDialogOpen, confirmAddNewRestaurant } = useCart();
  const { t } = useLanguage();

  if (!pendingItem) return null;

  return (
    <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('cart.multiRestaurant.title')}</DialogTitle>
          <DialogDescription>
            {t('cart.multiRestaurant.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Restaurants actuels */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Store className="w-4 h-4" />
              {t('cart.multiRestaurant.current')}
            </p>
            <div className="space-y-2">
              {restaurants.map((r) => (
                <div key={r.restaurantId} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span>{r.restaurantName || t('cart.multiRestaurant.unknown')}</span>
                  <span className="text-xs text-gray-500">
                    ({r.items.length} {r.items.length === 1 ? t('cart.multiRestaurant.item') : t('cart.multiRestaurant.items')})
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Nouveau restaurant */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm font-medium mb-3 flex items-center gap-2 text-orange-900">
              <Store className="w-4 h-4" />
              {t('cart.multiRestaurant.new')}
            </p>
            <div className="text-sm text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <span>{pendingItem.restaurantName || t('cart.multiRestaurant.unknown')}</span>
              <span className="text-xs text-gray-500">
                ({t('cart.multiRestaurant.willAdd')})
              </span>
            </div>
          </div>
          
          {/* Note */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              {t('cart.multiRestaurant.note')}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsConfirmDialogOpen(false)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={confirmAddNewRestaurant}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
          >
            {t('cart.multiRestaurant.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

