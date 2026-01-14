import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'en' | 'ar';

type Translations = {
  [key: string]: {
    fr: string;
    en: string;
    ar: string;
  };
};

/**
 * ⚠️ RÈGLE DE DÉVELOPPEMENT IMPORTANTE ⚠️
 * 
 * TOUTE nouvelle fonctionnalité DOIT être traduite dans les 3 langues (FR, EN, AR).
 * 
 * ❌ NE PAS utiliser de texte hardcodé en français dans les composants
 * ✅ TOUJOURS utiliser t('ma.clé') avec useLanguage()
 * 
 * Voir docs/TRANSLATION_GUIDE.md pour plus de détails.
 */
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
  'cart.error.nameMin': { fr: "Le nom doit contenir au moins 2 caractères", en: "Name must contain at least 2 characters", ar: "يجب أن يحتوي الاسم على حرفين على الأقل" },
  'cart.error.phoneMin': { fr: "Le téléphone doit contenir au moins 8 caractères", en: "Phone must contain at least 8 characters", ar: "يجب أن يحتوي الهاتف على 8 أحرف على الأقل" },
  'cart.error.addressMin': { fr: "L'adresse doit contenir au moins 5 caractères", en: "Address must contain at least 5 characters", ar: "يجب أن يحتوي العنوان على 5 أحرف على الأقل" },
  'cart.error.emptyCart': { fr: "Le panier est vide", en: "Cart is empty", ar: "السلة فارغة" },
  'cart.error.sendOtp': { fr: "Impossible d'envoyer le code", en: "Unable to send code", ar: "تعذر إرسال الرمز" },
  'cart.error.zoneNotDeliverable': { fr: "Cette zone est hors de notre zone de livraison", en: "This area is outside our delivery zone", ar: "هذه المنطقة خارج نطاق التوصيل" },
  'cart.error.zoneTooFar': { fr: "La distance est trop importante. La distance maximale de livraison est de 30 km.", en: "Distance is too far. Maximum delivery distance is 30 km.", ar: "المسافة بعيدة جداً. الحد الأقصى للتوصيل هو 30 كم." },

  // Success
  'success.title': { fr: "Commande Reçue !", en: "Order Received!", ar: "تم استلام الطلب!" },
  'success.desc': { fr: "Merci ! Nos chefs préparent déjà votre pizza.", en: "Thanks! Our chefs are already preparing your pizza.", ar: "شكراً! طهاتنا يقومون بإعداد البيتزا الخاصة بك." },
  'success.contact': { fr: "Un livreur vous contactera bientôt au numéro indiqué.", en: "A delivery person will contact you shortly.", ar: "سيتصل بك عامل التوصيل قريباً." },
  'success.time': { fr: "Temps estimé", en: "Estimated time", ar: "الوقت المقدر" },
  'success.orderNum': { fr: "Numéro de commande", en: "Order number", ar: "رقم الطلب" },
  'success.back': { fr: "Retour à l'accueil", en: "Back to home", ar: "العودة للرئيسية" },
  'success.call_driver': { fr: "Appeler le livreur", en: "Call driver", ar: "اتصل بالسائق" },

  // Order Delivered - Messages de succès après livraison
  'order.delivered.title': { fr: "Commande livrée !", en: "Order Delivered!", ar: "تم التوصيل!" },
  'order.delivered.message': { fr: "Merci pour votre commande", en: "Thank you for your order", ar: "شكراً لطلبك" },
  'order.delivered.redirecting': { fr: "Redirection en cours...", en: "Redirecting...", ar: "جاري إعادة التوجيه..." },

  // Order Tracking Page (order-success.tsx)
  'order.tracking.title': { fr: "Suivi de commande", en: "Order Tracking", ar: "تتبع الطلب" },
  'order.tracking.searching.title': { fr: "Recherche de livreur autour...", en: "Searching for driver nearby...", ar: "البحث عن سائق قريب..." },
  'order.tracking.searching.desc': { fr: "Nous cherchons un livreur disponible près de vous", en: "We are looking for an available driver near you", ar: "نبحث عن سائق متاح بالقرب منك" },
  'order.tracking.found.title': { fr: "Livreur trouvé !", en: "Driver found!", ar: "تم العثور على سائق!" },
  'order.tracking.found.desc': { fr: "Préparation de votre commande...", en: "Preparing your order...", ar: "جارٍ تحضير طلبك..." },
  'order.tracking.deliveryAddress': { fr: "Adresse de livraison", en: "Delivery address", ar: "عنوان التوصيل" },
  'order.tracking.deliveryAddress.unavailable': { fr: "Adresse non disponible", en: "Address unavailable", ar: "العنوان غير متاح" },
  'order.tracking.driver.title': { fr: "Votre livreur", en: "Your driver", ar: "سائقك" },
  'order.tracking.driver.default': { fr: "Livreur", en: "Driver", ar: "سائق" },
  'order.tracking.estimatedTime': { fr: "Temps estimé", en: "Estimated time", ar: "الوقت المقدر" },
  'order.tracking.status.title': { fr: "Statut", en: "Status", ar: "الحالة" },
  'order.tracking.status.received': { fr: "Commande reçue", en: "Order received", ar: "تم استلام الطلب" },
  'order.tracking.status.preparing': { fr: "En préparation", en: "Preparing", ar: "قيد التحضير" },
  'order.tracking.status.delivery': { fr: "En livraison", en: "Out for delivery", ar: "قيد التوصيل" },
  'order.tracking.status.delivered': { fr: "Livrée", en: "Delivered", ar: "تم التوصيل" },
  'order.tracking.status.inProgress': { fr: "En cours...", en: "In progress...", ar: "قيد التنفيذ..." },
  'order.tracking.details.title': { fr: "Détails", en: "Details", ar: "التفاصيل" },
  'order.tracking.details.restaurant': { fr: "Restaurant", en: "Restaurant", ar: "المطعم" },
  'order.tracking.details.items': { fr: "Articles", en: "Items", ar: "العناصر" },
  'order.tracking.details.items.singular': { fr: "article", en: "item", ar: "عنصر" },
  'order.tracking.details.items.plural': { fr: "articles", en: "items", ar: "عناصر" },
  'order.tracking.details.total': { fr: "Total", en: "Total", ar: "المجموع" },
  'order.tracking.callDriver': { fr: "Appeler le livreur", en: "Call driver", ar: "اتصل بالسائق" },
  'order.tracking.back': { fr: "Retour", en: "Back", ar: "رجوع" },
  'order.tracking.restaurant.default': { fr: "Restaurant", en: "Restaurant", ar: "مطعم" },
  'order.tracking.shareLocation': { fr: "Partager ma position exacte via WhatsApp", en: "Share my exact location via WhatsApp", ar: "مشاركة موقعي الدقيق عبر واتساب" },
  'order.tracking.shareLocation.message': { fr: "📍 *Localisation de livraison pour la commande #{orderId}*\n\nVoici ma position exacte : {mapsLink}\n\nالرجاء التوصيل إلى هذا الموقع", en: "📍 *Delivery location for order #{orderId}*\n\nHere is my exact location: {mapsLink}\n\nالرجاء التوصيل إلى هذا الموقع", ar: "📍 *موقع التوصيل للطلب رقم #{orderId}*\n\nهذا موقعي الدقيق: {mapsLink}\n\nالرجاء التوصيل إلى هذا الموقع" },
  'order.tracking.shareLocation.error': { fr: "Impossible d'accéder à votre position. Veuillez vérifier les permissions GPS.", en: "Unable to access your location. Please check GPS permissions.", ar: "تعذر الوصول إلى موقعك. يرجى التحقق من أذونات GPS." },
  'order.tracking.shareLocation.denied': { fr: "Accès à la position refusé. Veuillez autoriser l'accès GPS dans les paramètres.", en: "Location access denied. Please allow GPS access in settings.", ar: "تم رفض الوصول إلى الموقع. يرجى السماح بالوصول إلى GPS في الإعدادات." },
  'order.tracking.shareLocation.success': { fr: "Position partagée avec succès", en: "Location shared successfully", ar: "تم مشاركة الموقع بنجاح" },

  // Tracker
  'tracker.title': { fr: "Suivi de commande", en: "Order Tracking", ar: "تتبع الطلب" },
  'tracker.status.received': { fr: "Commande reçue", en: "Order Received", ar: "تم استلام الطلب" },
  'tracker.status.accepted': { fr: "Acceptée", en: "Accepted", ar: "مقبولة" },
  'tracker.status.ready': { fr: "Prête", en: "Ready", ar: "جاهزة" },
  'tracker.status.delivery': { fr: "En route", en: "On the way", ar: "في الطريق" },
  'tracker.status.delivered': { fr: "Livrée", en: "Delivered", ar: "تم التوصيل" },
  // Anciens statuts pour compatibilité (ne plus utilisés dans le workflow MVP)
  'tracker.status.prep': { fr: "En cuisine", en: "Preparing", ar: "في التحضير" },
  'tracker.status.bake': { fr: "Au four", en: "Baking", ar: "في الفرن" },
  'tracker.eta': { fr: "Arrivée estimée dans", en: "Estimated arrival in", ar: "الوصول المتوقع خلال" },
  'tracker.min': { fr: "min", en: "min", ar: "دقيقة" },

  // Order History
  'history.title': { fr: "Mes Commandes", en: "My Orders", ar: "طلباتي" },
  'history.subtitle': { fr: "Consultez l'historique de vos commandes (mise à jour auto)", en: "View your order history (auto-updated)", ar: "اعرض سجل طلباتك (تحديث تلقائي)" },
  'history.security': { fr: "Vérification de sécurité requise", en: "Security verification required", ar: "مطلوب التحقق الأمني" },
  'history.phone': { fr: "Numéro de téléphone", en: "Phone number", ar: "رقم الهاتف" },
  'history.phone.placeholder': { fr: "Ex: 21123456789", en: "Ex: 21123456789", ar: "مثال: 21123456789" },
  'history.sendOtp': { fr: "Envoyer OTP", en: "Send OTP", ar: "إرسال الرمز" },
  'history.sending': { fr: "Envoi...", en: "Sending...", ar: "جاري الإرسال..." },
  'history.sent': { fr: "Code envoyé ✓", en: "Code sent ✓", ar: "تم إرسال الرمز ✓" },
  'history.code': { fr: "Code OTP (4 chiffres)", en: "OTP code (4 digits)", ar: "رمز التحقق (4 أرقام)" },
  'history.code.placeholder': { fr: "Ex: 1234", en: "Ex: 1234", ar: "مثال: 1234" },
  'history.verify': { fr: "Vérifier", en: "Verify", ar: "تحقق" },
  'history.verifying': { fr: "Vérif...", en: "Verifying...", ar: "جاري التحقق..." },
  'history.demoCode': { fr: "Code démo pour test: 1234", en: "Demo code for testing: 1234", ar: "رمز التجربة: 1234" },
  'history.otpSent': { fr: "Code OTP envoyé par SMS", en: "OTP code sent via SMS", ar: "تم إرسال رمز التحقق عبر SMS" },
  'history.otpError': { fr: "Erreur lors de l'envoi du code OTP", en: "Error sending OTP code", ar: "خطأ في إرسال الرمز" },
  'history.codeLengthError': { fr: "Veuillez entrer un code de 4 chiffres", en: "Please enter a 4-digit code", ar: "الرجاء إدخال رمز من 4 أرقام" },
  'history.codeInvalid': { fr: "Code OTP invalide", en: "Invalid OTP code", ar: "رمز غير صحيح" },
  'history.verifyError': { fr: "Erreur lors de la vérification du code", en: "Error verifying code", ar: "خطأ في التحقق" },
  'history.verified': { fr: "Téléphone vérifié", en: "Phone verified", ar: "تم التحقق من الهاتف" },
  'history.verified.desc': { fr: "Téléphone vérifié avec succès !", en: "Phone verified successfully!", ar: "تم التحقق من الهاتف بنجاح!" },
  'history.change': { fr: "Changer", en: "Change", ar: "تغيير" },
  'history.view': { fr: "Voir mes commandes", en: "View my orders", ar: "عرض طلباتي" },
  'history.searching': { fr: "Recherche...", en: "Searching...", ar: "جاري البحث..." },
  'history.noOrders': { fr: "Aucune commande trouvée", en: "No orders found", ar: "لم يتم العثور على طلبات" },
  'history.ordersFound': { fr: "commande(s) trouvée(s)", en: "order(s) found", ar: "تم العثور على طلبات" },
  'history.orderStatus': { fr: "Statut", en: "Status", ar: "الحالة" },
  'history.orderDate': { fr: "Date indisponible", en: "Date unavailable", ar: "التاريخ غير متاح" },
  'history.orderItems': { fr: "Articles:", en: "Items:", ar: "العناصر:" },
  'history.fetchError': { fr: "Erreur lors de la récupération des commandes", en: "Error fetching orders", ar: "خطأ في استرجاع الطلبات" },
  'history.statusPending': { fr: "En attente", en: "Pending", ar: "قيد الانتظار" },
  'history.statusAccepted': { fr: "Acceptée", en: "Accepted", ar: "مقبولة" },
  'history.statusPreparing': { fr: "Préparation", en: "Preparing", ar: "التحضير" },
  'history.statusBaking': { fr: "Cuisson", en: "Baking", ar: "الخبز" },
  'history.statusReady': { fr: "Prête", en: "Ready", ar: "جاهزة" },
  'history.statusDelivery': { fr: "En livraison", en: "Delivery", ar: "قيد التوصيل" },
  'history.statusDelivered': { fr: "Livrée", en: "Delivered", ar: "تم التوصيل" },
  'history.statusRejected': { fr: "Rejetée", en: "Rejected", ar: "مرفوضة" },
  'history.loading': { fr: "Chargement des commandes...", en: "Loading orders...", ar: "جاري تحميل الطلبات..." },
  'history.noOnboarding': { fr: "Vous devez compléter l'onboarding pour voir vos commandes.", en: "You must complete onboarding to view your orders.", ar: "يجب إكمال الإعداد لعرض طلباتك." },
  'history.completeOnboarding': { fr: "Compléter l'onboarding", en: "Complete onboarding", ar: "إكمال الإعداد" },

  // Menu page
  'menu.loading': { fr: "Chargement...", en: "Loading...", ar: "جاري التحميل..." },
  'menu.restaurantNotFound': { fr: "Restaurant non trouvé", en: "Restaurant not found", ar: "المطعم غير موجود" },
  'menu.backHome': { fr: "Retour à l'accueil", en: "Back to home", ar: "العودة للرئيسية" },
  'menu.status.open': { fr: "Ouvert", en: "Open", ar: "مفتوح" },
  'menu.status.closed': { fr: "Fermé", en: "Closed", ar: "مغلق" },
  'menu.status.temporarilyClosed': { fr: "🔒 Fermé temporairement", en: "🔒 Temporarily closed", ar: "🔒 مغلق مؤقتاً" },
  'menu.status.temporarilyClosedMessage': { fr: "⚠️ Restaurant fermé temporairement", en: "⚠️ Restaurant temporarily closed", ar: "⚠️ المطعم مغلق مؤقتاً" },
  'menu.status.temporarilyClosedDesc': { fr: "Le restaurant est fermé temporairement. Veuillez réessayer plus tard.", en: "The restaurant is temporarily closed. Please try again later.", ar: "المطعم مغلق مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً." },
  'menu.status.openingHours': { fr: "Horaires d'ouverture :", en: "Opening hours:", ar: "ساعات العمل:" },
  'menu.status.closedDay': { fr: "Jour de repos :", en: "Closed day:", ar: "يوم الراحة:" },
  'menu.status.closedBySchedule': { fr: "Le restaurant est fermé selon les horaires d'ouverture.", en: "The restaurant is closed according to opening hours.", ar: "المطعم مغلق حسب ساعات العمل." },
  'menu.deliveryFee': { fr: "livraison", en: "delivery", ar: "توصيل" },
  'menu.reviews': { fr: "avis", en: "reviews", ar: "تقييم" },
  'menu.restaurantClosed': { fr: "Restaurant fermé", en: "Restaurant closed", ar: "المطعم مغلق" },
  'menu.restaurantClosed.desc': { fr: "Le restaurant sera ouvert de", en: "The restaurant will be open from", ar: "سيكون المطعم مفتوحاً من" },
  'menu.restaurantClosed.now': { fr: "Le restaurant est actuellement fermé.", en: "The restaurant is currently closed.", ar: "المطعم مغلق حالياً." },
  'menu.noProducts.category': { fr: "Aucun produit dans la catégorie", en: "No products in category", ar: "لا توجد منتجات في الفئة" },
  'menu.noProducts.restaurant': { fr: "Aucun produit disponible pour ce restaurant", en: "No products available for this restaurant", ar: "لا توجد منتجات متاحة لهذا المطعم" },
  'menu.noProducts.tryCategory': { fr: "Essayez une autre catégorie", en: "Try another category", ar: "جرب فئة أخرى" },
  'menu.noProducts.create': { fr: "Créez des produits pour ce restaurant depuis l'espace admin", en: "Create products for this restaurant from the admin panel", ar: "أنشئ منتجات لهذا المطعم من لوحة الإدارة" },
  'menu.phoneCall.title': { fr: "Commande par téléphone", en: "Order by phone", ar: "الطلب عبر الهاتف" },
  'menu.phoneCall.description': { fr: "Pour passer commande, veuillez appeler directement le restaurant. Notre équipe se fera un plaisir de prendre votre commande.", en: "To place an order, please call the restaurant directly. Our team will be happy to take your order.", ar: "لإتمام الطلب، يرجى الاتصال بالمطعم مباشرة. فريقنا سيكون سعيداً لأخذ طلبك." },
  'menu.phoneCall.callNow': { fr: "Appeler maintenant", en: "Call now", ar: "اتصل الآن" },
  'menu.comingSoon.title': { fr: "Bientôt disponible", en: "Coming soon", ar: "قريباً" },
  'menu.comingSoon.description': { fr: "Les commandes en ligne pour ce restaurant seront bientôt disponibles. Revenez bientôt !", en: "Online orders for this restaurant will be available soon. Check back soon!", ar: "الطلبات عبر الإنترنت لهذا المطعم ستكون متاحة قريباً. تحقق مرة أخرى قريباً!" },
  'menu.add': { fr: "Ajouter", en: "Add", ar: "إضافة" },
  'menu.category.all': { fr: "Tout", en: "All", ar: "الكل" },
  'menu.category.pizza': { fr: "Pizza", en: "Pizza", ar: "بيتزا" },
  'menu.category.burger': { fr: "Burger", en: "Burger", ar: "برجر" },
  'menu.category.salade': { fr: "Salade", en: "Salad", ar: "سلطة" },
  'menu.category.grill': { fr: "Grillades", en: "Grilled", ar: "مشويات" },
  'menu.category.drink': { fr: "Boisson", en: "Drink", ar: "مشروب" },
  'menu.category.dessert': { fr: "Dessert", en: "Dessert", ar: "حلوى" },
  
  // Opening Hours
  'openingHours.title': { fr: "Horaires d'ouverture", en: "Opening hours", ar: "ساعات العمل" },
  'openingHours.opensAt': { fr: "Ouvre à", en: "Opens at", ar: "يفتح في" },
  'openingHours.closed': { fr: "Fermé", en: "Closed", ar: "مغلق" },
  'openingHours.open': { fr: "Ouvert", en: "Open", ar: "مفتوح" },
  'openingHours.opensIn': { fr: "Ouvre dans {minutes} min", en: "Opens in {minutes} min", ar: "يفتح بعد {minutes} دق" },
  'openingHours.closesSoon': { fr: "Ferme bientôt ({minutes} min)", en: "Closes soon ({minutes} min)", ar: "يغلق قريباً ({minutes} دق)" },

  // Common
  'common.loading': { fr: "Chargement...", en: "Loading...", ar: "جاري التحميل..." },
  'common.currency': { fr: "DT", en: "TND", ar: "د.ت" },
  'common.min': { fr: "min", en: "min", ar: "دقيقة" },
  'common.back': { fr: "Retour", en: "Back", ar: "رجوع" },
  'common.save': { fr: "Enregistrer", en: "Save", ar: "حفظ" },
  'common.add': { fr: "Ajouter", en: "Add", ar: "إضافة" },
  'common.addToCart': { fr: "Ajouter au panier", en: "Add to cart", ar: "إضافة إلى السلة" },
  'common.cancel': { fr: "Annuler", en: "Cancel", ar: "إلغاء" },
  
  // Geolocation
  'geolocation.notSupported': { fr: "La géolocalisation n'est pas supportée par ce navigateur.", en: "Geolocation is not supported by your browser.", ar: "المتصفح لا يدعم تحديد الموقع الجغرافي." },
  'geolocation.permissionDenied': { fr: "Permission de géolocalisation refusée.", en: "Geolocation permission denied.", ar: "تم رفض إذن تحديد الموقع الجغرافي." },
  'geolocation.positionUnavailable': { fr: "Position indisponible.", en: "Position unavailable.", ar: "الموقع غير متاح." },
  'geolocation.timeout': { fr: "Délai d'attente dépassé.", en: "Request timeout.", ar: "انتهت مهلة الطلب." },
  'geolocation.unknownError': { fr: "Impossible de récupérer votre position.", en: "Unable to retrieve your location.", ar: "تعذر الحصول على موقعك." },
  
  // Menu product
  'menu.product.defaultDescription': { fr: "Délicieux plat préparé avec soin", en: "Delicious dish prepared with care", ar: "طبق لذيذ محضر بعناية" },

  // Home page
  'home.location': { fr: "Tataouine, Tunisie", en: "Tataouine, Tunisia", ar: "تطاوين، تونس" },
  'home.hero.title.part1': { fr: "Vos plats préférés,", en: "Your favorite dishes,", ar: "أطباقك المفضلة،" },
  'home.hero.title.part2': { fr: "livrés", en: "delivered", ar: "مُوصلة" },
  'home.hero.description': { fr: "Commandez auprès des meilleurs restaurants de Tataouine et recevez votre repas en quelques minutes.", en: "Order from the best restaurants in Tataouine and receive your meal in minutes.", ar: "اطلب من أفضل المطاعم في تطاوين واحصل على وجبتك في دقائق." },
  'home.features.fastDelivery': { fr: "Livraison rapide", en: "Fast delivery", ar: "توصيل سريع" },
  'home.features.cashPayment': { fr: "Paiement espèces", en: "Cash payment", ar: "دفع نقدي" },
  'home.search.placeholder': { fr: "Rechercher un restaurant ou un plat...", en: "Search for a restaurant or dish...", ar: "ابحث عن مطعم أو طبق..." },
  'home.search.loading': { fr: "Recherche en cours...", en: "Searching...", ar: "جاري البحث..." },
  'home.search.results': { fr: "{count} plat trouvé", en: "{count} dish found", ar: "تم العثور على {count} طبق" },
  'home.search.results.plural': { fr: "{count} plats trouvés", en: "{count} dishes found", ar: "تم العثور على {count} أطباق" },
  'home.search.noResults': { fr: "Aucun plat trouvé", en: "No dish found", ar: "لم يتم العثور على أطباق" },
  'home.search.tryOther': { fr: "Essayez avec d'autres mots-clés", en: "Try with other keywords", ar: "جرب كلمات مفتاحية أخرى" },
  'home.search.callUs': { fr: "Vous ne trouvez pas ce que vous cherchez ? Pas de problème, appelez-nous et nous aurons le plaisir de vous répondre et trouver ce que vous aimez !", en: "Can't find what you're looking for? No problem, call us and we'll be happy to help you find what you like!", ar: "لا تجد ما تبحث عنه؟ لا مشكلة، اتصل بنا وسنكون سعداء لمساعدتك في العثور على ما تحب!" },
  'home.search.callNow': { fr: "Appelez-nous", en: "Call us", ar: "اتصل بنا" },
  'home.search.noRestaurants': { fr: "Aucun résultat trouvé", en: "No results found", ar: "لم يتم العثور على نتائج" },
  'home.restaurant.default': { fr: "Restaurant", en: "Restaurant", ar: "مطعم" },
  'home.restaurants.open': { fr: "Restaurants ouverts", en: "Open restaurants", ar: "المطاعم المفتوحة" },
  'home.restaurants.available': { fr: "{count} disponible", en: "{count} available", ar: "{count} متاح" },
  'home.restaurants.available.plural': { fr: "{count} disponibles", en: "{count} available", ar: "{count} متاحة" },
  'home.restaurants.closed': { fr: "Fermés actuellement", en: "Currently closed", ar: "مغلقة حالياً" },

  // Delivery Modes Page
  'delivery.hero.title': { fr: "Livraison rapide et fiable", en: "Fast and Reliable Delivery", ar: "توصيل سريع وموثوق" },
  'delivery.hero.subtitle': { fr: "Choisissez votre mode de transport et recevez vos marchandises où vous voulez, quand vous voulez.", en: "Choose your transport mode and get your goods delivered wherever you want, whenever you want.", ar: "اختر وسيلة النقل المناسبة واستلم بضائعك أينما تريد وفي الوقت الذي تريده." },
  'delivery.modes.title': { fr: "Choisissez votre mode de livraison", en: "Choose your delivery mode", ar: "اختر نوع التوصيل" },
  'delivery.mode.bike.title': { fr: "Livraison à Vélo", en: "Bicycle Delivery", ar: "التوصيل بالدراجة الهوائية" },
  'delivery.mode.bike.desc': { fr: "Rapide et écologique, idéal pour les petits colis dans le centre-ville", en: "Fast and eco-friendly, ideal for small packages in the city center", ar: "سريع وصديق للبيئة، مثالي للطرود الصغيرة في وسط المدينة" },
  'delivery.mode.scooter.title': { fr: "Livraison en Scooter", en: "Scooter Delivery", ar: "التوصيل بـ \"السكوتير\"" },
  'delivery.mode.scooter.desc': { fr: "Idéal pour les livraisons rapides de tous types dans toute la ville", en: "Ideal for quick deliveries of all kinds across the city", ar: "مثالي للتوصيل السريع لجميع أنواع الطلبات في المدينة" },
  'delivery.mode.tuktuk.title': { fr: "Livraison en Tuk-Tuk", en: "Tuk-Tuk Delivery", ar: "التوصيل بـ \"التوك توك\"" },
  'delivery.mode.tuktuk.desc': { fr: "Parfait pour les quartiers étroits et les marchandises de taille moyenne", en: "Perfect for narrow streets and medium-sized goods", ar: "ممتاز للأزقة الضيقة والبضائع متوسطة الحجم" },
  'delivery.mode.truck.title': { fr: "Livraison en Camion", en: "Truck Delivery", ar: "التوصيل بالشاحنة" },
  'delivery.mode.truck.desc': { fr: "Pour les gros volumes, marchandises lourdes et commandes groupées", en: "For large volumes, heavy merchandise, and bulk orders", ar: "للكميات الكبيرة، البضائع الثقيلة والطلبات الجماعية" },
  'delivery.mode.tractor.title': { fr: "Livraison Agricole", en: "Agricultural Delivery", ar: "التوصيل الفلاحي" },
  'delivery.mode.tractor.desc': { fr: "Transport de matériaux et produits agricoles", en: "Transport of materials and agricultural products", ar: "نقل المعدات والمنتجات الفلاحية" },
  'delivery.feature.express.title': { fr: "Livraison Express", en: "Express Delivery", ar: "توصيل \"إكسبريس\"" },
  'delivery.feature.express.desc': { fr: "Recevez votre livraison en moins de 30 minutes", en: "Get your delivery in less than 30 minutes", ar: "استلم طلبيتك في أقل من 30 دقيقة" },
  'delivery.feature.tracking.title': { fr: "Suivi en Temps Réel", en: "Real-Time Tracking", ar: "تتبع مباشر" },
  'delivery.feature.tracking.desc': { fr: "Suivez votre livraison en direct sur la carte", en: "Follow your delivery live on the map", ar: "تابع الشحنة مباشرة على الخريطة" },
  'delivery.feature.secure.title': { fr: "100% Sécurisé", en: "100% Secure", ar: "آمن 100%" },
  'delivery.feature.secure.desc': { fr: "Vos marchandises sont assurées et protégées", en: "Your goods are insured and protected", ar: "بضائعكم مؤمنة ومحمية بالكامل" },
  'delivery.cta.restaurants': { fr: "Voir nos restaurants", en: "View our restaurants", ar: "اكتشف مطاعمنا" },
  'delivery.toggle.modeLivraison': { fr: "Mode Livraison", en: "Delivery Mode", ar: "وضع التوصيل" },
  'delivery.toggle.modeRestaurants': { fr: "Mode Restaurants", en: "Restaurants Mode", ar: "وضع المطاعم" },
  'delivery.toggle.activated': { fr: "Modes de livraison activés pour tous les utilisateurs", en: "Delivery modes activated for all users", ar: "تم تفعيل أوضاع التوصيل لجميع المستخدمين" },
  'delivery.toggle.deactivated': { fr: "Modes de livraison désactivés pour tous les utilisateurs", en: "Delivery modes deactivated for all users", ar: "تم إلغاء تفعيل أوضاع التوصيل لجميع المستخدمين" },
  'delivery.toggle.localEnabled': { fr: "Mode livraison activé (vue personnelle)", en: "Delivery mode activated (personal view)", ar: "تم تفعيل وضع التوصيل (عرض شخصي)" },
  'delivery.toggle.localDisabled': { fr: "Mode restaurants activé (vue personnelle)", en: "Restaurants mode activated (personal view)", ar: "تم تفعيل وضع المطاعم (عرض شخصي)" },

  // Delivery Form - Step 1
  'delivery.step': { fr: "Étape {step} sur 3", en: "Step {step} of 3", ar: "الخطوة {step} من 3" },
  'delivery.step1.addresses.title': { fr: "Adresses de livraison", en: "Delivery Addresses", ar: "عناوين التوصيل" },
  'delivery.step1.pickup.placeholder': { fr: "Adresse de récupération", en: "Pickup address", ar: "مكان الاستلام" },
  'delivery.step1.delivery.placeholder': { fr: "Adresse de livraison", en: "Delivery address", ar: "مكان التسليم" },
  'delivery.step1.continue': { fr: "Continuer", en: "Continue", ar: "متابعة" },
  'delivery.step1.error.pickup': { fr: "Veuillez entrer une adresse de récupération", en: "Please enter a pickup address", ar: "الرجاء إدخال عنوان الاستلام" },
  'delivery.step1.error.delivery': { fr: "Veuillez entrer une adresse de livraison", en: "Please enter a delivery address", ar: "الرجاء إدخال عنوان التسليم" },

  // Delivery Form - Step 2
  'delivery.step2.info.title': { fr: "Vos informations", en: "Your Information", ar: "معلوماتك الشخصية" },
  'delivery.step2.name.placeholder': { fr: "Votre nom", en: "Your name", ar: "اسمك" },
  'delivery.step2.phone.placeholder': { fr: "XX XXX XXX", en: "XX XXX XXX", ar: "XX XXX XXX" },
  'delivery.step2.error.name': { fr: "Veuillez entrer un nom valide (minimum 2 caractères)", en: "Please enter a valid name (minimum 2 characters)", ar: "الرجاء إدخال اسم صحيح (حد أدنى حرفين)" },
  'delivery.step2.error.phone': { fr: "Veuillez entrer un numéro de téléphone valide (minimum 8 chiffres)", en: "Please enter a valid phone number (minimum 8 digits)", ar: "الرجاء إدخال رقم هاتف صحيح (حد أدنى 8 أرقام)" },

  // Delivery Form - Step 3
  'delivery.step3.package.title': { fr: "Description du colis", en: "Package Description", ar: "وصف الطرد" },
  'delivery.step3.package.placeholder': { fr: "Ex: Carton, documents, nourriture", en: "Ex: Box, documents, food", ar: "مثال: صندوق، وثائق، طعام" },
  'delivery.step3.summary.title': { fr: "Récapitulatif", en: "Summary", ar: "ملخص الطلب" },
  'delivery.step3.summary.type': { fr: "Type de livraison:", en: "Delivery Type:", ar: "نوع التوصيل:" },
  'delivery.step3.summary.pickup': { fr: "Récupération:", en: "Pickup:", ar: "مكان الاستلام:" },
  'delivery.step3.summary.delivery': { fr: "Livraison:", en: "Delivery:", ar: "مكان التسليم:" },
  'delivery.step3.summary.recipient': { fr: "Destinataire:", en: "Recipient:", ar: "المستلم:" },
  'delivery.step3.summary.total': { fr: "Total estimé:", en: "Estimated Total:", ar: "المجموع التقديري:" },
  'delivery.step3.summary.notSpecified': { fr: "Non spécifié", en: "Not specified", ar: "غير محدد" },
  'delivery.step3.back': { fr: "Retour", en: "Back", ar: "رجوع" },
  'delivery.step3.confirm': { fr: "Confirmer", en: "Confirm", ar: "تأكيد" },
  'delivery.step3.loading': { fr: "Chargement...", en: "Loading...", ar: "جاري التحميل..." },
  'delivery.step3.error.missing': { fr: "Données manquantes. Veuillez recommencer.", en: "Missing data. Please start over.", ar: "بيانات مفقودة. يرجى البدء من جديد." },

  // Delivery Professional Page
  'delivery.professional.title': { fr: "Professionnel", en: "Professional", ar: "المهني" },
  'delivery.professional.pickup': { fr: "Récupération", en: "Pickup", ar: "الاستلام" },
  'delivery.professional.delivery': { fr: "Livraison", en: "Delivery", ar: "التسليم" },
  'delivery.professional.description': { fr: "Description", en: "Description", ar: "الوصف" },
  'delivery.professional.recipient': { fr: "Destinataire", en: "Recipient", ar: "المستلم" },
  'delivery.professional.call': { fr: "Appeler", en: "Call", ar: "اتصل" },
  'delivery.professional.whatsapp': { fr: "WhatsApp", en: "WhatsApp", ar: "واتساب" },
  'delivery.professional.info': { fr: "Contactez directement le professionnel pour finaliser votre demande de livraison.", en: "Contact the professional directly to finalize your delivery request.", ar: "اتصل بالمهني مباشرة لإتمام طلب التوصيل الخاص بك." },
  'delivery.professional.whatsapp.message': { fr: "Bonjour {name},\n\nJe souhaite réserver une {mode}.\n\nRécupération: {pickup}\nLivraison: {delivery}\nDescription: {description}\n\nMerci !", en: "Hello {name},\n\nI would like to book a {mode}.\n\nPickup: {pickup}\nDelivery: {delivery}\nDescription: {description}\n\nThank you!", ar: "مرحباً {name}،\n\nأود حجز {mode}.\n\nالاستلام: {pickup}\nالتسليم: {delivery}\nالوصف: {description}\n\nشكراً!" },
  'delivery.professional.experience.years': { fr: "ans d'expérience", en: "years of experience", ar: "سنوات من الخبرة" },

  // Size Selection
  'menu.sizeSelection.description': { fr: "Choisissez la taille de votre produit", en: "Choose your product size", ar: "اختر حجم منتجك" },
  'menu.sizeSelection.required': { fr: "Veuillez sélectionner une taille", en: "Please select a size", ar: "الرجاء اختيار حجم" },
  'menu.sizeSelection.invalid': { fr: "Taille invalide", en: "Invalid size", ar: "حجم غير صالح" },
  'menu.sizeSelection.available': { fr: "Plusieurs tailles", en: "Multiple sizes", ar: "أحجام متعددة" },
  'menu.size.small': { fr: "Petite", en: "Small", ar: "صغيرة" },
  'menu.size.medium': { fr: "Moyenne", en: "Medium", ar: "متوسطة" },
  'menu.size.large': { fr: "Grande", en: "Large", ar: "كبيرة" },
  'menu.addToCart.error': { fr: "Impossible d'ajouter au panier", en: "Unable to add to cart", ar: "تعذر الإضافة إلى السلة" },
  'common.cancel': { fr: "Annuler", en: "Cancel", ar: "إلغاء" },

  // Multi-restaurant cart
  'cart.multiRestaurant.title': { fr: "Ajouter un autre restaurant ?", en: "Add another restaurant?", ar: "إضافة مطعم آخر؟" },
  'cart.multiRestaurant.description': { fr: "Votre panier contient déjà des articles d'un autre restaurant.", en: "Your cart already contains items from another restaurant.", ar: "سلة التسوق تحتوي بالفعل على عناصر من مطعم آخر." },
  'cart.multiRestaurant.current': { fr: "Restaurant(s) actuel(s) :", en: "Current restaurant(s):", ar: "المطعم(ات) الحالي(ة):" },
  'cart.multiRestaurant.new': { fr: "Nouveau restaurant :", en: "New restaurant:", ar: "مطعم جديد:" },
  'cart.multiRestaurant.willAdd': { fr: "sera ajouté", en: "will be added", ar: "سيتم إضافته" },
  'cart.multiRestaurant.note': { fr: "Note : Chaque restaurant aura sa propre commande et frais de livraison.", en: "Note: Each restaurant will have its own order and delivery fee.", ar: "ملاحظة: كل مطعم سيكون له طلبه ورسوم التوصيل الخاصة به." },
  'cart.multiRestaurant.confirm': { fr: "Ajouter quand même", en: "Add anyway", ar: "إضافة على أي حال" },
  'cart.multiRestaurant.item': { fr: "article", en: "item", ar: "عنصر" },
  'cart.multiRestaurant.items': { fr: "articles", en: "items", ar: "عناصر" },
  'cart.multiRestaurant.unknown': { fr: "Restaurant", en: "Restaurant", ar: "مطعم" },
  'cart.subtotal': { fr: "Sous-total", en: "Subtotal", ar: "المجموع الفرعي" },
  'cart.deliveryFee': { fr: "Frais de livraison", en: "Delivery fee", ar: "رسوم التوصيل" },
  'cart.restaurantTotal': { fr: "Total restaurant", en: "Restaurant total", ar: "إجمالي المطعم" },
  'cart.error.order': { fr: "Erreur lors de la commande", en: "Order error", ar: "خطأ في الطلب" },
  'cart.error.orderDescription': { fr: "Certaines commandes n'ont pas pu être créées. Veuillez réessayer.", en: "Some orders could not be created. Please try again.", ar: "تعذر إنشاء بعض الطلبات. يرجى المحاولة مرة أخرى." },
  'cart.multiRestaurant.totalNote': { fr: "Total incluant les frais de livraison de tous les restaurants", en: "Total including delivery fees from all restaurants", ar: "الإجمالي يشمل رسوم التوصيل من جميع المطاعم" },
  'cart.multiRestaurant.warning': { fr: "⚠️ Attention : Vous avez des produits de {count} restaurant(s) différent(s)", en: "⚠️ Warning: You have products from {count} different restaurant(s)", ar: "⚠️ تحذير: لديك منتجات من {count} مطعم(ات) مختلف(ة)" },
  'cart.multiRestaurant.warningDesc': { fr: "Cela créera {count} commande(s) séparée(s), chacune avec sa propre livraison. Vous recevrez {count} notification(s) de livraison.", en: "This will create {count} separate order(s), each with its own delivery. You will receive {count} delivery notification(s).", ar: "سيؤدي هذا إلى إنشاء {count} طلب(ات) منفصل(ة)، كل منها مع توصيله الخاص. سوف تتلقى {count} إشعار(ات) توصيل." },
  'cart.activeOrder.title': { fr: "⚠️ Commande en cours détectée", en: "⚠️ Active order detected", ar: "⚠️ تم اكتشاف طلب نشط" },
  'cart.activeOrder.description': { fr: "Vous avez déjà une commande en cours de livraison.", en: "You already have an order being delivered.", ar: "لديك بالفعل طلب قيد التوصيل." },
  'cart.activeOrder.warning': { fr: "Attention : Créer une nouvelle commande signifie :", en: "Warning: Creating a new order means:", ar: "تحذير: إنشاء طلب جديد يعني:" },
  'cart.activeOrder.consequence1': { fr: "Vous aurez plusieurs commandes séparées", en: "You will have multiple separate orders", ar: "سيكون لديك عدة طلبات منفصلة" },
  'cart.activeOrder.consequence2': { fr: "Plusieurs livraisons distinctes avec des livreurs potentiellement différents", en: "Multiple distinct deliveries with potentially different drivers", ar: "عدة توصيلات متميزة مع سائقي توصيل محتملين مختلفين" },
  'cart.activeOrder.consequence3': { fr: "Plusieurs notifications de suivi", en: "Multiple tracking notifications", ar: "عدة إشعارات تتبع" },
  'cart.activeOrder.question': { fr: "Souhaitez-vous vraiment créer une nouvelle commande distincte ?", en: "Do you really want to create a new separate order?", ar: "هل تريد حقًا إنشاء طلب جديد منفصل؟" },
  'cart.activeOrder.confirm': { fr: "Oui, créer une nouvelle commande", en: "Yes, create new order", ar: "نعم، إنشاء طلب جديد" },

  // Profile
  'nav.profile': { fr: "Profil", en: "Profile", ar: "الملف الشخصي" },
  'profile.title': { fr: "Mon Profil", en: "My Profile", ar: "ملفي الشخصي" },
  'profile.subtitle': { fr: "Informations personnelles", en: "Personal information", ar: "المعلومات الشخصية" },
  'profile.phone': { fr: "Téléphone", en: "Phone", ar: "الهاتف" },
  'profile.address': { fr: "Adresse", en: "Address", ar: "العنوان" },
  'profile.location': { fr: "Position", en: "Location", ar: "الموقع" },
  'profile.actions.history': { fr: "Historique des commandes", en: "Order History", ar: "سجل الطلبات" },
  'profile.actions.history.desc': { fr: "Voir toutes vos commandes", en: "View all your orders", ar: "عرض جميع طلباتك" },
  'profile.actions.language': { fr: "Langue", en: "Language", ar: "اللغة" },
  'profile.actions.language.desc': { fr: "Changer la langue de l'application", en: "Change application language", ar: "تغيير لغة التطبيق" },
  'profile.edit.title': { fr: "Modifier le profil", en: "Edit Profile", ar: "تعديل الملف الشخصي" },
  'profile.edit.desc': { fr: "Mettre à jour vos informations personnelles", en: "Update your personal information", ar: "تحديث معلوماتك الشخصية" },
  'profile.edit.button': { fr: "Modifier", en: "Edit", ar: "تعديل" },
  'profile.guest': { fr: "Invité", en: "Guest", ar: "ضيف" },
  'profile.notFound.title': { fr: "Profil non trouvé", en: "Profile not found", ar: "الملف الشخصي غير موجود" },
  'profile.notFound.desc': { fr: "Vous devez compléter l'onboarding pour accéder à votre profil.", en: "You must complete onboarding to access your profile.", ar: "يجب إكمال الإعداد للوصول إلى ملفك الشخصي." },
  'profile.notFound.action': { fr: "Compléter l'onboarding", en: "Complete onboarding", ar: "إكمال الإعداد" },
  'profile.member': { fr: "Membre", en: "Member", ar: "عضو" },
  'profile.actions.addresses': { fr: "Adresses", en: "Addresses", ar: "العناوين" },
  'profile.paymentMethods': { fr: "Méthodes de paiement", en: "Payment Methods", ar: "طرق الدفع" },
  'profile.paymentMethods.desc': { fr: "Gérer vos moyens de paiement", en: "Manage your payment methods", ar: "إدارة طرق الدفع الخاصة بك" },
  'profile.giftCards': { fr: "Cartes cadeaux & crédits", en: "Gift Cards & Credits", ar: "بطاقات الهدايا والائتمانات" },
  'profile.giftCards.desc': { fr: "Gérer vos crédits", en: "Manage your credits", ar: "إدارة رصيدك" },
  'profile.helpCenter': { fr: "Centre d'aide", en: "Help Center", ar: "مركز المساعدة" },
  'profile.helpCenter.desc': { fr: "FAQ et support", en: "FAQ and support", ar: "الأسئلة الشائعة والدعم" },
  'profile.inviteFriends': { fr: "Inviter des amis - Obtenez 10€ de réduction", en: "Invite friends - Get 10€ discount", ar: "دعوة الأصدقاء - احصل على خصم 10 يورو" },
  'profile.settings': { fr: "Paramètres", en: "Settings", ar: "الإعدادات" },
  'profile.logout': { fr: "Déconnexion", en: "Logout", ar: "تسجيل الخروج" },
  'profile.address.manage': { fr: "Gérer les adresses", en: "Manage Addresses", ar: "إدارة العناوين" },
  'profile.address.manageDesc': { fr: "Ajouter, modifier ou supprimer vos adresses sauvegardées", en: "Add, edit or delete your saved addresses", ar: "إضافة أو تعديل أو حذف عناوينك المحفوظة" },
  'profile.address.default': { fr: "Par défaut", en: "Default", ar: "افتراضي" },
  'profile.address.setDefault': { fr: "Définir par défaut", en: "Set as default", ar: "تعيين كافتراضي" },
  'profile.address.delete': { fr: "Supprimer", en: "Delete", ar: "حذف" },
  'profile.address.none': { fr: "Aucune adresse sauvegardée", en: "No saved addresses", ar: "لا توجد عناوين محفوظة" },
  'profile.address.addNew': { fr: "Ajouter une nouvelle adresse", en: "Add New Address", ar: "إضافة عنوان جديد" },
  'profile.address.label': { fr: "Nom", en: "Label", ar: "الاسم" },
  'profile.address.labelPlaceholder': { fr: "Nom (ex: Domicile, Travail)", en: "Label (e.g., Home, Work)", ar: "الاسم (مثل: منزل، عمل)" },
  'profile.address.street': { fr: "Adresse", en: "Address", ar: "العنوان" },
  'profile.address.streetPlaceholder': { fr: "Adresse complète", en: "Full address", ar: "العنوان الكامل" },
  'profile.address.details': { fr: "Détails", en: "Details", ar: "التفاصيل" },
  'profile.address.detailsPlaceholder': { fr: "Détails supplémentaires (optionnel)", en: "Additional details (optional)", ar: "تفاصيل إضافية (اختياري)" },
  'profile.address.save': { fr: "Enregistrer l'adresse", en: "Save Address", ar: "حفظ العنوان" },
  'profile.address.saved': { fr: "Adresse sauvegardée", en: "Address saved", ar: "تم حفظ العنوان" },
  'profile.address.savedDesc': { fr: "Cette adresse sera disponible pour vos prochaines commandes", en: "This address will be available for your next orders", ar: "سيكون هذا العنوان متاحًا لطلباتك القادمة" },
  'profile.address.defaultUpdated': { fr: "Adresse par défaut mise à jour", en: "Default address updated", ar: "تم تحديث العنوان الافتراضي" },
  'profile.address.deleted': { fr: "Adresse supprimée", en: "Address deleted", ar: "تم حذف العنوان" },
  'profile.address.error': { fr: "Erreur", en: "Error", ar: "خطأ" },
  'profile.address.minOneRequired': { fr: "Vous devez avoir au moins une adresse", en: "You must have at least one address", ar: "يجب أن يكون لديك عنوان واحد على الأقل" },
  'profile.address.minLength': { fr: "L'adresse doit contenir au moins 5 caractères", en: "Address must be at least 5 characters", ar: "يجب أن يحتوي العنوان على 5 أحرف على الأقل" },
  'profile.address.duplicate': { fr: "Cette adresse existe déjà", en: "This address already exists", ar: "هذا العنوان موجود بالفعل" },

  // PWA Install Prompt
  'pwa.install.message': { fr: "Plus rapide, plus fluide. Ajoutez Tataouine Pizza à votre écran d'accueil.", en: "Faster, smoother. Add Tataouine Pizza to your home screen.", ar: "أسرع وأكثر سلاسة. أضف تاطاوين بيتزا إلى شاشتك الرئيسية." },
  'pwa.install.button': { fr: "Installer", en: "Install", ar: "تثبيت" },
  'pwa.install.later': { fr: "Plus tard", en: "Later", ar: "لاحقاً" },
  'pwa.install.instructions': { fr: "Voir instructions", en: "See instructions", ar: "عرض التعليمات" },
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: { [key: string]: string | number }) => string;
  dir: 'ltr' | 'rtl';
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'tataouine-pizza-language';
const I18NEXT_STORAGE_KEY = 'i18nextLng'; // Clé standard i18next

/**
 * Détecte la langue du navigateur/téléphone
 * Hiérarchie de détection :
 * 1. localStorage (clé i18nextLng ou tataouine-pizza-language) - PRIORITÉ ABSOLUE
 * 2. Si aucune préférence sauvegardée → ARABE par défaut (ignorer navigator.language)
 * 
 * Note: L'arabe est la langue par défaut même si le navigateur est en anglais/français.
 * L'utilisateur peut changer manuellement via le sélecteur de langue.
 */
function detectLanguage(): Language {
  const supportedLanguages: Language[] = ['fr', 'en', 'ar'];
  
  // 1. Vérifier d'abord localStorage avec la clé i18nextLng (standard)
  let savedLanguage = localStorage.getItem(I18NEXT_STORAGE_KEY);
  
  // 2. Si vide, vérifier l'ancienne clé pour compatibilité
  if (!savedLanguage) {
    savedLanguage = localStorage.getItem(STORAGE_KEY);
  }
  
  // 3. Si une langue est sauvegardée et qu'elle est supportée, l'utiliser (PRIORITÉ ABSOLUE)
  if (savedLanguage && (supportedLanguages.includes(savedLanguage as Language))) {
    console.log(`[i18n] ✅ Langue détectée depuis localStorage: ${savedLanguage}`);
    return savedLanguage as Language;
  }

  // 4. Si aucune préférence sauvegardée → ARABE par défaut (ignorer navigator.language)
  // L'arabe est la langue par défaut de l'application
  console.log(`[i18n] ✅ Langue par défaut utilisée: ar (aucune préférence sauvegardée)`);
  return 'ar';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Détecter la langue au chargement (une seule fois)
  const [language, setLanguageState] = useState<Language>(() => {
    const detected = detectLanguage();
    console.log(`[i18n] 🌍 Langue détectée au démarrage: ${detected}`);
    return detected;
  });

  // Sauvegarder la langue dans localStorage quand elle change
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    // Sauvegarder dans les deux clés pour compatibilité
    localStorage.setItem(STORAGE_KEY, lang);
    localStorage.setItem(I18NEXT_STORAGE_KEY, lang);
    console.log(`[i18n] ✅ Langue changée et sauvegardée: ${lang}`);
  };

  // Appliquer RTL/LTR et lang au document
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, params?: { [key: string]: string | number }) => {
    // Gérer le pluriel pour certaines clés
    let finalKey = key;
    if (params?.count !== undefined) {
      const count = typeof params.count === 'number' ? params.count : Number(params.count);
      if (count > 1) {
      const pluralKey = `${key}.plural`;
      if (translations[pluralKey]) {
        finalKey = pluralKey;
        }
      }
    }
    
    let translation = translations[finalKey]?.[language];
    
    // Remplacer les paramètres dans la traduction
    if (translation && params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }
    
    if (!translation && process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Traduction manquante pour la clé "${finalKey}" en ${language}`);
    }
    return translation || key;
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
