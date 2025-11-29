import { useState } from "react";
import { PizzaCard } from "@/components/pizza-card";
import { Pizza } from "@/lib/cart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

import pizzaMargherita from "@assets/generated_images/pizza_margherita.png";
import pizzaTunisian from "@assets/generated_images/tunisian_pizza.png";
import pizzaPepperoni from "@assets/generated_images/pizza_pepperoni.png";
import pizzaVegetarian from "@assets/generated_images/vegetarian_pizza.png";
// Reusing images for variety in mockup
const pizzas: Pizza[] = [
  {
    id: 1,
    name: "Margherita",
    description: "Sauce tomate, mozzarella di bufala, basilic frais, huile d'olive extra vierge.",
    price: 12.00,
    image: pizzaMargherita,
    category: "classic"
  },
  {
    id: 2,
    name: "La Tunisienne",
    description: "Thon, olives noires, œuf, harissa artisanale, fromage, persil.",
    price: 18.00,
    image: pizzaTunisian,
    category: "special"
  },
  {
    id: 3,
    name: "Pepperoni Lover",
    description: "Double pepperoni piquant, mozzarella fondante, origan.",
    price: 16.50,
    image: pizzaPepperoni,
    category: "classic"
  },
  {
    id: 4,
    name: "Végétarienne du Sud",
    description: "Poivrons, oignons rouges, champignons frais, olives, tomates cerises.",
    price: 15.00,
    image: pizzaVegetarian,
    category: "vegetarian"
  },
  {
    id: 5,
    name: "Tataouine Spéciale",
    description: "Merguez, poivrons grillés, œuf, olives, sauce tomate épicée.",
    price: 19.00,
    image: pizzaTunisian, // Reusing image
    category: "special"
  },
  {
    id: 6,
    name: "4 Fromages",
    description: "Mozzarella, Gorgonzola, Parmesan, Chèvre, miel (optionnel).",
    price: 17.50,
    image: pizzaMargherita, // Reusing image
    category: "classic"
  }
];

export default function Menu() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filteredPizzas = pizzas.filter(pizza => {
    const matchesSearch = pizza.name.toLowerCase().includes(search.toLowerCase()) || 
                          pizza.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || pizza.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Notre Menu</h1>
          <p className="text-muted-foreground mt-1">Découvrez nos pizzas artisanales.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Rechercher une pizza..." 
            className="pl-9 bg-white/50 backdrop-blur border-primary/20 focus-visible:ring-primary"
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
            Tout
          </TabsTrigger>
          <TabsTrigger 
            value="classic" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[80px]"
          >
            Classiques
          </TabsTrigger>
          <TabsTrigger 
            value="special" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[80px]"
          >
            Spéciales
          </TabsTrigger>
          <TabsTrigger 
            value="vegetarian" 
            className="rounded-full border bg-card px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm min-w-[80px]"
          >
            Végétariennes
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
              <p>Aucune pizza ne correspond à votre recherche.</p>
              <button 
                onClick={() => {setSearch(""); setCategory("all")}}
                className="text-primary hover:underline mt-2 font-medium"
              >
                Voir tout le menu
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
