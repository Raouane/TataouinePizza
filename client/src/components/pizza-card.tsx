import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pizza, useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

interface PizzaCardProps {
  pizza: Pizza;
  onAddToCart?: () => void;
  disabled?: boolean;
}

export function PizzaCard({ pizza, onAddToCart, disabled = false }: PizzaCardProps) {
  const { addItem } = useCart();
  
  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart();
    } else {
      addItem(pizza);
    }
  };
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  return (
    <Card className={cn(
      "overflow-hidden group border-none shadow-sm hover:shadow-md transition-all duration-300 bg-card/50",
      disabled && "opacity-60"
    )}>
      <div className="aspect-square overflow-hidden relative">
        <img
          src={pizza.image}
          alt={pizza.name}
          className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
        <div className={`absolute bottom-3 ${isRtl ? 'left-3' : 'right-3'}`}>
          <span className="bg-white/90 backdrop-blur text-foreground font-bold px-3 py-1 rounded-full text-sm shadow-sm">
            {pizza.price.toFixed(2)} TND
          </span>
        </div>
      </div>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="font-serif text-lg text-foreground group-hover:text-primary transition-colors">
          {pizza.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <CardDescription className="text-muted-foreground text-sm line-clamp-2 min-h-[2.5rem]">
          {pizza.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={handleAdd}
          disabled={disabled}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm group-active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
          {disabled ? "Restaurant fermé" : t('card.add')}
        </Button>
      </CardFooter>
    </Card>
  );
}
