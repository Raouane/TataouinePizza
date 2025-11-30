import { useState, useEffect } from "react";
import { PizzaCard } from "@/components/pizza-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { fetchPizzas } from "@/lib/api";
import type { Pizza as ApiPizza } from "@/lib/api";

import pizzaMargherita from "@assets/generated_images/pizza_margherita.png";
import pizzaTunisian from "@assets/generated_images/tunisian_pizza.png";
import pizzaPepperoni from "@assets/generated_images/pizza_pepperoni.png";
import pizzaVegetarian from "@assets/generated_images/vegetarian_pizza.png";

// Map pizzas to images for demo (since API doesn't store full URLs)
const imageMap: { [key: string]: string } = {
  "Margherita": pizzaMargherita,
  "La Tunisienne": pizzaTunisian,
  "Pepperoni": pizzaPepperoni,
  "Vegetarian": pizzaVegetarian,
};

interface Pizza {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  category: string;
}

export default function Menu() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  useEffect(() => {
    const loadPizzas = async () => {
      try {
        const data = await fetchPizzas();
        const transformed = data.map((p: ApiPizza) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: parseFloat(p.prices[0]?.price || "0"),
          image: imageMap[p.name] || pizzaMargherita,
          category: p.category,
        }));
        setPizzas(transformed);
      } catch (error) {
        console.error("Failed to load pizzas:", error);
      } finally {
        setLoading(false);
      }
    };
    loadPizzas();
  }, []);

  const filteredPizzas = pizzas.filter(pizza => {
    const matchesSearch = pizza.name.toLowerCase().includes(search.toLowerCase()) || 
                          (pizza.description && pizza.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === "all" || pizza.category === category;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">🍕</div>
          <p className="text-muted-foreground">{t('menu.loading') || 'Chargement...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">{t('menu.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('menu.subtitle')}</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 ${isRtl ? 'right-3' : 'left-3'}`} />
          <Input 
            placeholder={t('menu.search')}
            className={`${isRtl ? 'pr-9' : 'pl-9'} bg-white/50 backdrop-blur border-primary/20 focus-visible:ring-primary`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={category} onValueChange={setCategory} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent p-0 h-auto gap-2 mb-6 no-scrollbar">
          <TabsTrigger 
            value="all" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[80px]"
          >
            {t('cat.all')}
          </TabsTrigger>
          <TabsTrigger 
            value="classic" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[80px]"
          >
            {t('cat.classic')}
          </TabsTrigger>
          <TabsTrigger 
            value="special" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[80px]"
          >
            {t('cat.special')}
          </TabsTrigger>
          <TabsTrigger 
            value="vegetarian" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[80px]"
          >
            {t('cat.vegetarian')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={category} className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPizzas.map((pizza) => (
              <div key={pizza.id} className="animate-in zoom-in-95 duration-300 fill-mode-both" style={{ animationDelay: `${pizza.id * 50}ms` }}>
                <PizzaCard pizza={pizza} />
              </div>
            ))}
          </div>
          
          {filteredPizzas.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t('menu.empty')}</p>
              <button 
                onClick={() => {setSearch(""); setCategory("all")}}
                className="text-primary hover:underline mt-2 font-medium"
              >
                {t('bestsellers.viewAll')}
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
