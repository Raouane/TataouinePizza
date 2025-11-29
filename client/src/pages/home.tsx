import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, ChefHat, Clock, MapPin } from "lucide-react";
import heroImage from "@assets/generated_images/tataouine_landscape_with_pizza.png";
import pizzaMargherita from "@assets/generated_images/pizza_margherita.png";
import pizzaTunisian from "@assets/generated_images/tunisian_pizza.png";
import pizzaPepperoni from "@assets/generated_images/pizza_pepperoni.png";

import { useLanguage } from "@/lib/i18n";

export default function Home() {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden min-h-[60vh] flex items-end shadow-xl">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Tataouine Pizza"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
        
        <div className="relative z-10 p-6 md:p-12 w-full max-w-3xl">
          <div className="inline-block px-3 py-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-full mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {t('hero.badge')}
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-4 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
            {t('hero.title.1')} <br />
            <span className="text-primary">{t('hero.title.2')}</span>
          </h1>
          <p className="text-lg text-white/90 mb-8 max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            {t('hero.desc')}
          </p>
          <Link href="/menu">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 h-14 rounded-full animate-in fade-in zoom-in duration-1000 delay-300 shadow-lg shadow-primary/25">
              {t('hero.cta')}
              <ArrowRight className={`w-5 h-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'}`} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Clock, title: t('features.delivery'), desc: t('features.delivery.desc') },
          { icon: ChefHat, title: t('features.homemade'), desc: t('features.homemade.desc') },
          { icon: MapPin, title: t('features.local'), desc: t('features.local.desc') },
        ].map((feature, i) => (
          <div key={i} className="bg-card p-6 rounded-2xl border shadow-sm flex items-start gap-4 hover:-translate-y-1 transition-transform duration-300">
            <div className="bg-primary/10 p-3 rounded-xl">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg mb-1">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Bestsellers Preview */}
      <section>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-serif font-bold mb-2">{t('bestsellers.title')}</h2>
            <p className="text-muted-foreground">{t('bestsellers.subtitle')}</p>
          </div>
          <Link href="/menu">
            <a className="text-primary hover:underline hidden md:inline-flex items-center gap-1 font-medium">
              {t('bestsellers.viewAll')} <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </a>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mock Data Preview */}
          {[
             { 
               name: "La Tunisienne", 
               price: "18.00 TND", 
               img: pizzaTunisian,
               desc: "Thon, olives noires, œuf, harissa"
             },
             { 
               name: "Margherita", 
               price: "12.00 TND", 
               img: pizzaMargherita,
               desc: "Sauce tomate, mozzarella di bufala, basilic" 
             },
             { 
               name: "Pepperoni", 
               price: "16.50 TND", 
               img: pizzaPepperoni,
               desc: "Pepperoni piquant, mozzarella fondante" 
             },
          ].map((item, i) => (
             <Link key={i} href="/menu">
               <div className="group cursor-pointer">
                 <div className="aspect-square rounded-2xl overflow-hidden mb-4 relative">
                   <img src={item.img} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                   <div className={`absolute bottom-3 ${isRtl ? 'left-3' : 'right-3'} bg-white/90 backdrop-blur px-3 py-1 rounded-full font-bold text-sm shadow-sm`}>
                     {item.price}
                   </div>
                 </div>
                 <h3 className="font-serif font-bold text-xl mb-1 group-hover:text-primary transition-colors">{item.name}</h3>
                 <p className="text-muted-foreground text-sm">{item.desc}</p>
               </div>
             </Link>
          ))}
        </div>
        
        <div className="mt-8 text-center md:hidden">
          <Link href="/menu">
            <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/5">
              {t('bestsellers.viewAll')}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
