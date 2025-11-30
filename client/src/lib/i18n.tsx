import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'en' | 'ar';

type Translations = {
  [key: string]: {
    fr: string;
    en: string;
    ar: string;
  };
};

const translations: Translations = {
  // Navigation
  'nav.home': { fr: 'Accueil', en: 'Home', ar: 'الرئيسية' },
  'nav.menu': { fr: 'Menu', en: 'Menu', ar: 'القائمة' },
  'nav.cart': { fr: 'Panier', en: 'Cart', ar: 'السلة' },
  
  // Home
  'hero.badge': { fr: "OUVERT JUSQU'À MINUIT", en: "OPEN UNTIL MIDNIGHT", ar: "مفتوح حتى منتصف الليل" },
  'hero.title.1': { fr: "L'authentique goût", en: "The authentic taste", ar: "المذاق الأصلي" },
  'hero.title.2': { fr: "du désert.", en: "of the desert.", ar: "للصحراء." },
  'hero.desc': { fr: "Des ingrédients frais, une pâte artisanale et une livraison rapide dans tout Tataouine.", en: "Fresh ingredients, handmade dough, and fast delivery all over Tataouine.", ar: "مكونات طازجة، عجينة يدوية، وتوصيل سريع في كامل تطاوين." },
  'hero.cta': { fr: "Commander Maintenant", en: "Order Now", ar: "اطلب الآن" },
  
  'features.delivery': { fr: "Livraison Rapide", en: "Fast Delivery", ar: "توصيل سريع" },
  'features.delivery.desc': { fr: "Moins de 45 minutes chez vous.", en: "Under 45 minutes to your door.", ar: "أقل من 45 دقيقة إليك." },
  'features.homemade': { fr: "Faite Maison", en: "Homemade", ar: "صناعة منزلية" },
  'features.homemade.desc': { fr: "Pâte pétrie chaque matin.", en: "Dough kneaded every morning.", ar: "عجينة تُعجن كل صباح." },
  'features.local': { fr: "Local & Frais", en: "Local & Fresh", ar: "محلي وطازج" },
  'features.local.desc': { fr: "Ingrédients du marché local.", en: "Ingredients from the local market.", ar: "مكونات من السوق المحلي." },
  
  'bestsellers.title': { fr: "Nos Best-Sellers", en: "Our Best Sellers", ar: "الأكثر مبيعاً" },
  'bestsellers.subtitle': { fr: "Les favoris de nos clients cette semaine.", en: "Customer favorites this week.", ar: "مفضلات زبائننا هذا الأسبوع." },
  'bestsellers.viewAll': { fr: "Voir tout le menu", en: "View full menu", ar: "عرض القائمة كاملة" },

  // Menu
  'menu.title': { fr: "Notre Menu", en: "Our Menu", ar: "قائمتنا" },
  'menu.subtitle': { fr: "Découvrez nos pizzas artisanales.", en: "Discover our artisanal pizzas.", ar: "اكتشف البيتزا الحرفية لدينا." },
  'menu.search': { fr: "Rechercher une pizza...", en: "Search for a pizza...", ar: "ابحث عن بيتزا..." },
  'menu.empty': { fr: "Aucune pizza ne correspond à votre recherche.", en: "No pizzas match your search.", ar: "لا توجد بيتزا تطابق بحثك." },
  'cat.all': { fr: "Tout", en: "All", ar: "الكل" },
  'cat.classic': { fr: "Classiques", en: "Classics", ar: "كلاسيكي" },
  'cat.special': { fr: "Spéciales", en: "Specials", ar: "مميّز" },
  'cat.vegetarian': { fr: "Végétariennes", en: "Vegetarian", ar: "نباتي" },
  'card.add': { fr: "Ajouter", en: "Add", ar: "إضافة" },
  'card.update': { fr: "Quantité mise à jour", en: "Quantity updated", ar: "تم تحديث الكمية" },
  'card.added': { fr: "Ajouté au panier", en: "Added to cart", ar: "تمت الإضافة للسلة" },

  // Cart
  'cart.title': { fr: "Mon Panier", en: "My Cart", ar: "سلة مشترياتي" },
  'cart.empty': { fr: "Votre panier est vide", en: "Your cart is empty", ar: "سلتك فارغة" },
  'cart.empty.desc': { fr: "On dirait que vous n'avez pas encore fait votre choix. Nos pizzas vous attendent !", en: "Looks like you haven't made your choice yet. Our pizzas are waiting!", ar: "يبدو أنك لم تختر بعد. البيتزا بانتظارك!" },
  'cart.discover': { fr: "Découvrir le Menu", en: "Discover Menu", ar: "اكتشف القائمة" },
  'cart.step.1': { fr: "Panier", en: "Cart", ar: "السلة" },
  'cart.step.2': { fr: "Identification", en: "Identification", ar: "التعريف" },
  'cart.step.3': { fr: "Vérification", en: "Verification", ar: "التحقق" },
  'cart.step.4': { fr: "Livraison", en: "Delivery", ar: "التوصيل" },
  
  'cart.phone.title': { fr: "Quel est votre numéro ?", en: "What is your number?", ar: "ما هو رقم هاتفك؟" },
  'cart.phone.desc': { fr: "Nous vous enverrons un code de validation.", en: "We will send you a validation code.", ar: "سنرسل لك رمز التحقق." },
  'cart.name.label': { fr: "Votre prénom", en: "Your first name", ar: "الاسم الأول" },
  'cart.name.placeholder': { fr: "Ex: Ahmed", en: "Ex: John", ar: "مثال: أحمد" },
  
  'cart.verify.title': { fr: "Code de validation", en: "Validation Code", ar: "رمز التحقق" },
  'cart.verify.desc': { fr: "Envoyé au", en: "Sent to", ar: "أرسلت إلى" },
  'cart.resend': { fr: "Renvoyer le code", en: "Resend code", ar: "إعادة إرسال الرمز" },
  
  'cart.address.title': { fr: "Où livrer ?", en: "Where to deliver?", ar: "أين التوصيل؟" },
  'cart.address.subtitle': { fr: "Livraison gratuite à Tataouine", en: "Free delivery in Tataouine", ar: "توصيل مجاني في تطاوين" },
  'cart.address.street': { fr: "Quartier / Rue", en: "Neighborhood / Street", ar: "الحي / الشارع" },
  'cart.address.street.ph': { fr: "Ex: Cité Mahrajene...", en: "Ex: Mahrajene District...", ar: "مثال: حي المهرجان..." },
  'cart.address.details': { fr: "Indications supplémentaires", en: "Additional details", ar: "تفاصيل إضافية" },
  'cart.address.details.ph': { fr: "Ex: Maison porte bleue...", en: "Ex: Blue door house...", ar: "مثال: منزل بباب أزرق..." },
  
  'cart.total': { fr: "Total", en: "Total", ar: "المجموع" },
  'cart.continue': { fr: "Continuer", en: "Continue", ar: "متابعة" },
  'cart.confirm': { fr: "Confirmer la commande", en: "Confirm Order", ar: "تأكيد الطلب" },
  'cart.error.phone': { fr: "Numéro invalide", en: "Invalid number", ar: "رقم غير صحيح" },
  'cart.error.name': { fr: "Veuillez entrer votre prénom", en: "Please enter your first name", ar: "الرجاء إدخال الاسم الأول" },
  'cart.error.code': { fr: "Code incorrect", en: "Incorrect code", ar: "الرمز غير صحيح" },
  'cart.error.address': { fr: "Veuillez entrer une adresse valide", en: "Please enter a valid address", ar: "الرجاء إدخال عنوان صحيح" },

  // Success
  'success.title': { fr: "Commande Reçue !", en: "Order Received!", ar: "تم استلام الطلب!" },
  'success.desc': { fr: "Merci ! Nos chefs préparent déjà votre pizza.", en: "Thanks! Our chefs are already preparing your pizza.", ar: "شكراً! طهاتنا يقومون بإعداد البيتزا الخاصة بك." },
  'success.contact': { fr: "Un livreur vous contactera bientôt au numéro indiqué.", en: "A delivery person will contact you shortly.", ar: "سيتصل بك عامل التوصيل قريباً." },
  'success.time': { fr: "Temps estimé", en: "Estimated time", ar: "الوقت المقدر" },
  'success.orderNum': { fr: "Numéro de commande", en: "Order number", ar: "رقم الطلب" },
  'success.back': { fr: "Retour à l'accueil", en: "Back to home", ar: "العودة للرئيسية" },
  'success.call_driver': { fr: "Appeler le livreur", en: "Call driver", ar: "اتصل بالسائق" },

  // Tracker
  'tracker.title': { fr: "Suivi de commande", en: "Order Tracking", ar: "تتبع الطلب" },
  'tracker.status.received': { fr: "Commande reçue", en: "Order Received", ar: "تم استلام الطلب" },
  'tracker.status.prep': { fr: "En cuisine", en: "Preparing", ar: "في التحضير" },
  'tracker.status.bake': { fr: "Au four", en: "Baking", ar: "في الفرن" },
  'tracker.status.ready': { fr: "Prête", en: "Ready", ar: "جاهزة" },
  'tracker.status.delivery': { fr: "En route", en: "On the way", ar: "في الطريق" },
  'tracker.status.delivered': { fr: "Livrée", en: "Delivered", ar: "تم التوصيل" },
  'tracker.eta': { fr: "Arrivée estimée dans", en: "Estimated arrival in", ar: "الوصول المتوقع خلال" },
  'tracker.min': { fr: "min", en: "min", ar: "دقيقة" },
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr');

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
