'use client';

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const WA_NUMBER = '213696928227';
const WA_BASE = `https://wa.me/${WA_NUMBER}`;

/* ═══════════════ TRANSLATIONS ═══════════════ */
const T: Record<string, Record<string, string>> = {
  fr: {
    nav_features: 'Fonctionnalités',
    nav_usecases: "Cas d'usage",
    nav_pricing: 'Tarifs',
    nav_contact: 'Contact',
    nav_cta: 'Essai Gratuit',
    nav_login: 'Se connecter',
    nav_register: "S'inscrire",
    hero_badge: '🇩🇿 Logiciel de Caisse Algérien N°1',
    hero_h1a: 'Gérez votre commerce avec',
    hero_h1b: 'intelligence',
    hero_desc:
      "SyncloudPOS est le logiciel tout-en-un pour les commerces algériens — hypermarchés, grossistes, boutiques, ateliers, pharmacies. Gérez ventes, stock, clients et finances depuis n'importe quel appareil.",
    hero_cta1: '🚀 Essai Gratuit 7 Jours',
    hero_cta2: 'Voir les fonctionnalités ↓',
    stat1: 'Fonctionnalités',
    stat2: 'Cloud & Local',
    stat3: 'Langues FR/AR/EN',
    stat4: 'Support 7j/7',
    fb1: 'Vente enregistrée',
    fb2: 'Stock mis à jour',
    fb3: 'IA active',
    trust_label: 'Conçu pour les commerces algériens :',
    t1: 'Hypermarchés', t2: 'Grossistes', t3: 'Boutiques', t4: 'Ateliers', t5: 'Pharmacies', t6: 'Quincailleries', t7: 'Restaurants',
    sec_feat_tag: 'Fonctionnalités',
    sec_feat_title: 'Tout ce dont votre commerce a besoin',
    sec_feat_desc: 'Plus de 120 fonctionnalités conçues pour les commerces algériens.',
    sec_uc_tag: "Cas d'utilisation",
    sec_uc_title: "À qui s'adresse SyncloudPOS ?",
    sec_uc_desc: 'Une solution flexible pour tous les secteurs du commerce en Algérie.',
    sec_how_tag: 'Comment ça marche',
    sec_how_title: 'Opérationnel en 4 étapes',
    sec_how_desc: 'Pas besoin de technicien. Configuration rapide, support inclus.',
    st1: 'Inscrivez-vous',
    st1d: 'Créez votre compte gratuitement. Configuration en 5 minutes.',
    st2: 'Ajoutez vos données',
    st2d: 'Importez produits, clients et fournisseurs depuis Excel.',
    st3: 'Commencez à vendre',
    st3d: 'Utilisez la caisse POS depuis ordinateur, tablette ou téléphone.',
    st4: 'Suivez vos résultats',
    st4d: 'Dashboard temps réel: CA, bénéfices, stock, clients.',
    sec_testi_tag: 'Success Story',
    sec_testi_title: 'Ils font confiance à SyncloudPOS',
    testi_quote:
      "« Avant SyncloudPOS, je perdais des heures chaque soir à calculer ma caisse. Aujourd'hui je gère mon hypermarché et mon dépôt depuis mon téléphone. Le suivi des crédits m'a fait récupérer plus de 400 000 DA de dettes oubliées. »",
    testi_name: 'Ahmed B.',
    testi_role: 'Propriétaire – 2 Hypermarchés + 1 Dépôt, Alger',
    sec_price_tag: 'Tarifs',
    sec_price_title: 'Plans adaptés à votre commerce',
    sec_price_desc: 'Toutes les fonctionnalités incluses. Tarification transparente.',
    p1_name: 'Starter',
    p1_price: 'Sur mesure',
    p1_sub: 'Devis via WhatsApp',
    p1_btn: 'Demander un devis',
    p2_name: 'Pro',
    p2_price: 'Sur mesure',
    p2_sub: 'Devis via WhatsApp',
    p2_btn: "Démarrer l'essai gratuit",
    recommended: '⭐ Recommandé',
    trial_pill: 'Offre Spéciale',
    trial_h2a: "7 jours d'essai",
    trial_h2b: '100% gratuits',
    trial_desc: 'Testez toutes les fonctionnalités sans engagement. Aucune carte bancaire requise.',
    trial_c1: 'Sans engagement',
    trial_c2: 'Accès complet',
    trial_c3: 'Support inclus',
    trial_btn1: '🚀 Démarrer maintenant',
    trial_btn2: '📲 WhatsApp',
    sec_cont_tag: 'Contact',
    sec_cont_title: 'Parlons de votre commerce',
    sec_cont_desc: "Disponible 7j/7 sur WhatsApp. De l'installation à la formation, on s'occupe de tout.",
    ci_avail: 'Disponibilité',
    ci_location: 'Localisation',
    ci_location_val: 'Algérie – Service national',
    ci_btn1: "🚀 Démarrer l'essai gratuit",
    ci_btn2: '📲 Commander sur WhatsApp',
    form_title: 'Message rapide',
    f_name: 'Votre nom',
    f_phone: 'Numéro WhatsApp',
    f_type: 'Type de commerce',
    f_msg: 'Votre message',
    f_ph_name: 'Ex: Ahmed Bensalem',
    f_ph_phone: '+213 6XX XX XX XX',
    f_ph_msg: 'Je voudrais tester SyncloudPOS...',
    f_send: '📲 Envoyer via WhatsApp',
    footer_desc: 'SyncloudPOS — le logiciel de caisse intelligent conçu pour les commerces algériens.',
    fl1: 'Fonctionnalités',
    fl2: 'Support',
    fl3: 'Langues',
    copyright: '© 2026 SyncloudPOS. Fait avec ❤️ en 🇩🇿 Algérie',
    features_link: 'Voir toutes les fonctionnalités →',
    f_opts_0: 'Sélectionnez...',
    f_opts_1: 'Hypermarché / Alimentation',
    f_opts_2: 'Commerce de gros',
    f_opts_3: 'Boutique vêtements',
    f_opts_4: 'Pharmacie',
    f_opts_5: 'Matériaux construction',
    f_opts_6: 'Électronique',
    f_opts_7: 'Atelier / Fabrication',
    f_opts_8: 'Autre',
    nav_apps: 'Apps',
    sec_apps_tag: 'Applications Mobiles',
    sec_apps_title: 'Votre commerce dans votre poche',
    sec_apps_desc: 'Deux applications mobiles dédiées pour le gérant et le livreur. Disponibles sur Android et iOS.',
    app1_name: 'SynCloud Gérant',
    app1_desc: 'L\'application du propriétaire. Suivez vos ventes, bénéfices, créances, flux de trésorerie et la performance de vos livreurs — tout depuis votre téléphone.',
    app1_f1: 'Dashboard temps réel',
    app1_f2: 'Rapports ventes & marges',
    app1_f3: 'Créances clients',
    app1_f4: 'Grand livre fournisseurs',
    app1_f5: 'Clôture de caisse',
    app1_f6: 'Monitoring livreurs GPS',
    app1_f7: 'Achats AI (OCR factures)',
    app1_f8: 'Gestion chèques & G50',
    app2_name: 'SynCloud Tournée',
    app2_desc: 'L\'application du livreur terrain. Gérez vos tournées, créez des BL, encaissez les paiements et gérez les retours — même hors connexion.',
    app2_f1: 'Plan de tournée',
    app2_f2: 'Fiche client terrain',
    app2_f3: 'Création BL sur place',
    app2_f4: 'Encaissement paiements',
    app2_f5: 'Retours produits',
    app2_f6: 'Chargement camion',
    app2_f7: 'Dashboard journée',
    app2_f8: 'Mode hors-ligne',
    testi2_quote: '« Depuis que j\'utilise SyncloudPOS, j\'ai divisé mes erreurs de stock par 10. L\'import Excel m\'a fait gagner 3 jours de saisie. Et les alertes WhatsApp pour les reçus ? Mes clientes adorent ! »',
    testi2_name: 'Samira K.',
    testi2_role: 'Gérante – Boutique Mode, Oran',
    testi3_quote: '« En tant que grossiste, j\'avais besoin de 3 prix différents par produit. SyncloudPOS gère ça parfaitement. Les tournées de livraison et la clôture de caisse quotidienne m\'ont changé la vie. »',
    testi3_name: 'Youcef M.',
    testi3_role: 'Grossiste – Distribution FMCG, Sétif',
  },
  en: {
    nav_features: 'Features',
    nav_usecases: 'Use Cases',
    nav_pricing: 'Pricing',
    nav_contact: 'Contact',
    nav_cta: 'Free Trial',
    nav_login: 'Login',
    nav_register: 'Register',
    hero_badge: '🇩🇿 Algeria\'s #1 POS Software',
    hero_h1a: 'Manage your business with',
    hero_h1b: 'intelligence',
    hero_desc:
      'SyncloudPOS is the all-in-one software for Algerian businesses — hypermarkets, wholesalers, shops, workshops, pharmacies. Manage sales, stock, customers and finances from any device.',
    hero_cta1: '🚀 Free 7-Day Trial',
    hero_cta2: 'See features ↓',
    stat1: 'Features',
    stat2: 'Cloud & Local',
    stat3: 'Languages FR/AR/EN',
    stat4: '24/7 Support',
    fb1: 'Sale recorded',
    fb2: 'Stock updated',
    fb3: 'AI active',
    trust_label: 'Built for Algerian businesses:',
    t1: 'Hypermarkets', t2: 'Wholesalers', t3: 'Shops', t4: 'Workshops', t5: 'Pharmacies', t6: 'Hardware stores', t7: 'Restaurants',
    sec_feat_tag: 'Features',
    sec_feat_title: 'Everything your business needs',
    sec_feat_desc: 'Over 120 features designed for Algerian businesses.',
    sec_uc_tag: 'Use Cases',
    sec_uc_title: 'Who is SyncloudPOS for?',
    sec_uc_desc: 'A flexible solution for all commerce sectors in Algeria.',
    sec_how_tag: 'How it works',
    sec_how_title: 'Ready in 4 steps',
    sec_how_desc: 'No technician needed. Quick setup, support included.',
    st1: 'Sign up',
    st1d: 'Create your account for free. Setup in 5 minutes.',
    st2: 'Add your data',
    st2d: 'Import products, customers and suppliers from Excel.',
    st3: 'Start selling',
    st3d: 'Use the POS from computer, tablet or phone.',
    st4: 'Track your results',
    st4d: 'Real-time dashboard: revenue, profits, stock, clients.',
    sec_testi_tag: 'Success Story',
    sec_testi_title: 'They trust SyncloudPOS',
    testi_quote:
      '"Before SyncloudPOS, I spent hours every evening calculating my register. Now I manage my hypermarket and warehouse from my phone. Credit tracking helped me recover over 400,000 DA in forgotten debts."',
    testi_name: 'Ahmed B.',
    testi_role: 'Owner – 2 Hypermarkets + 1 Warehouse, Algiers',
    sec_price_tag: 'Pricing',
    sec_price_title: 'Plans that fit your business',
    sec_price_desc: 'All features included. Transparent pricing.',
    p1_name: 'Starter',
    p1_price: 'Custom',
    p1_sub: 'Quote via WhatsApp',
    p1_btn: 'Request a quote',
    p2_name: 'Pro',
    p2_price: 'Custom',
    p2_sub: 'Quote via WhatsApp',
    p2_btn: 'Start free trial',
    recommended: '⭐ Recommended',
    trial_pill: 'Special Offer',
    trial_h2a: '7-day trial',
    trial_h2b: '100% free',
    trial_desc: 'Test all features with no commitment. No credit card required.',
    trial_c1: 'No commitment',
    trial_c2: 'Full access',
    trial_c3: 'Support included',
    trial_btn1: '🚀 Start now',
    trial_btn2: '📲 WhatsApp',
    sec_cont_tag: 'Contact',
    sec_cont_title: "Let's talk about your business",
    sec_cont_desc: 'Available 7/7 on WhatsApp. From installation to training, we handle everything.',
    ci_avail: 'Availability',
    ci_location: 'Location',
    ci_location_val: 'Algeria – Nationwide service',
    ci_btn1: '🚀 Start free trial',
    ci_btn2: '📲 Order on WhatsApp',
    form_title: 'Quick message',
    f_name: 'Your name',
    f_phone: 'WhatsApp number',
    f_type: 'Business type',
    f_msg: 'Your message',
    f_ph_name: 'E.g. Ahmed Bensalem',
    f_ph_phone: '+213 6XX XX XX XX',
    f_ph_msg: 'I would like to try SyncloudPOS...',
    f_send: '📲 Send via WhatsApp',
    footer_desc: 'SyncloudPOS — the smart POS software built for Algerian businesses.',
    fl1: 'Features',
    fl2: 'Support',
    fl3: 'Languages',
    copyright: '© 2026 SyncloudPOS. Made with ❤️ in 🇩🇿 Algeria',
    features_link: 'See all features →',
    f_opts_0: 'Select...',
    f_opts_1: 'Hypermarket / Food',
    f_opts_2: 'Wholesale',
    f_opts_3: 'Clothing shop',
    f_opts_4: 'Pharmacy',
    f_opts_5: 'Construction materials',
    f_opts_6: 'Electronics',
    f_opts_7: 'Workshop / Manufacturing',
    f_opts_8: 'Other',
    nav_apps: 'Apps',
    sec_apps_tag: 'Mobile Apps',
    sec_apps_title: 'Your business in your pocket',
    sec_apps_desc: 'Two dedicated mobile apps for the manager and the delivery driver. Available on Android and iOS.',
    app1_name: 'SynCloud Manager',
    app1_desc: 'The owner\'s app. Track your sales, profits, debts, cash flow and driver performance — all from your phone.',
    app1_f1: 'Real-time dashboard',
    app1_f2: 'Sales & margin reports',
    app1_f3: 'Client debts',
    app1_f4: 'Supplier ledger',
    app1_f5: 'Daily cash close',
    app1_f6: 'GPS driver monitoring',
    app1_f7: 'AI purchases (invoice OCR)',
    app1_f8: 'Cheques & G50 tax',
    app2_name: 'SynCloud Tournée',
    app2_desc: 'The field driver app. Manage routes, create delivery notes, collect payments and handle returns — even offline.',
    app2_f1: 'Route plan',
    app2_f2: 'Field client profiles',
    app2_f3: 'On-site delivery notes',
    app2_f4: 'Payment collection',
    app2_f5: 'Product returns',
    app2_f6: 'Truck loading',
    app2_f7: 'Daily dashboard',
    app2_f8: 'Offline mode',
    testi2_quote: '"Since I started using SyncloudPOS, my stock errors dropped by 90%. The Excel import saved me 3 days of manual entry. And WhatsApp receipts? My customers love it!"',
    testi2_name: 'Samira K.',
    testi2_role: 'Manager – Fashion Boutique, Oran',
    testi3_quote: '"As a wholesaler, I needed 3 different price tiers per product. SyncloudPOS handles that perfectly. Delivery routes and the daily cash close changed my life."',
    testi3_name: 'Youcef M.',
    testi3_role: 'Wholesaler – FMCG Distribution, Sétif',
  },
  ar: {
    nav_features: 'المميزات',
    nav_usecases: 'حالات الاستخدام',
    nav_pricing: 'الأسعار',
    nav_contact: 'اتصل بنا',
    nav_cta: 'تجربة مجانية',
    nav_login: 'تسجيل الدخول',
    nav_register: 'إنشاء حساب',
    hero_badge: '🇩🇿 برنامج الكاشير الجزائري رقم 1',
    hero_h1a: 'أدِر تجارتك بـ',
    hero_h1b: 'ذكاء',
    hero_desc:
      'SyncloudPOS هو البرنامج الشامل للتجارة الجزائرية — هايبر ماركت، تجار جملة، محلات، ورشات عمل، صيدليات. أدِر المبيعات والمخزون والعملاء والمالية من أي جهاز.',
    hero_cta1: '🚀 تجربة مجانية 7 أيام',
    hero_cta2: 'شاهد المميزات ↓',
    stat1: 'ميزة',
    stat2: 'سحابي ومحلي',
    stat3: 'لغات FR/AR/EN',
    stat4: 'دعم 7/7',
    fb1: 'تم تسجيل البيع',
    fb2: 'تم تحديث المخزون',
    fb3: 'الذكاء الاصطناعي نشط',
    trust_label: 'مصمم للتجارة الجزائرية:',
    t1: 'هايبر ماركت', t2: 'تجار الجملة', t3: 'محلات', t4: 'ورشات عمل', t5: 'صيدليات', t6: 'مواد البناء', t7: 'مطاعم',
    sec_feat_tag: 'المميزات',
    sec_feat_title: 'كل ما يحتاجه تجارتك',
    sec_feat_desc: 'أكثر من 120+ ميزة مصممة للتجارة الجزائرية.',
    sec_uc_tag: 'حالات الاستخدام',
    sec_uc_title: 'لمن مُوجّه SyncloudPOS؟',
    sec_uc_desc: 'حل مرن لجميع قطاعات التجارة في الجزائر.',
    sec_how_tag: 'كيف يعمل',
    sec_how_title: 'جاهز في 4 خطوات',
    sec_how_desc: 'لا حاجة لتقني. إعداد سريع، دعم مضمّن.',
    st1: 'سجّل حسابك',
    st1d: 'أنشئ حسابك مجاناً. الإعداد في 5 دقائق.',
    st2: 'أضف بياناتك',
    st2d: 'استورد المنتجات والعملاء والموردين من Excel.',
    st3: 'ابدأ البيع',
    st3d: 'استخدم الكاشير من الكمبيوتر أو التابلت أو الهاتف.',
    st4: 'تابع نتائجك',
    st4d: 'لوحة تحكم فورية: رقم الأعمال، الأرباح، المخزون.',
    sec_testi_tag: 'قصة نجاح',
    sec_testi_title: 'يثقون في SyncloudPOS',
    testi_quote:
      '« قبل SyncloudPOS، كنت نضيّع ساعات كل ليلة في حساب الكاشير. اليوم ندير الهايبر ماركت والمخزن من تليفوني. متابعة الديون خلاتني نسترجع أكثر من 400,000 دج من ديون منسية. »',
    testi_name: 'أحمد ب.',
    testi_role: 'مالك – 2 هايبر ماركت + 1 مخزن، الجزائر',
    sec_price_tag: 'الأسعار',
    sec_price_title: 'خطط تناسب تجارتك',
    sec_price_desc: 'كل المميزات مضمنة. تسعير شفاف.',
    p1_name: 'Starter',
    p1_price: 'حسب الطلب',
    p1_sub: 'عرض عبر WhatsApp',
    p1_btn: 'اطلب عرض سعر',
    p2_name: 'Pro',
    p2_price: 'حسب الطلب',
    p2_sub: 'عرض عبر WhatsApp',
    p2_btn: 'ابدأ التجربة المجانية',
    recommended: '⭐ موصى به',
    trial_pill: 'عرض خاص',
    trial_h2a: '7 أيام تجربة',
    trial_h2b: 'مجانية 100%',
    trial_desc: 'جرّب كل المميزات بدون التزام. بدون بطاقة بنكية.',
    trial_c1: 'بدون التزام',
    trial_c2: 'وصول كامل',
    trial_c3: 'دعم مضمّن',
    trial_btn1: '🚀 ابدأ الآن',
    trial_btn2: '📲 واتساب',
    sec_cont_tag: 'اتصل بنا',
    sec_cont_title: 'لنتحدث عن تجارتك',
    sec_cont_desc: 'متوفرون 7/7 على واتساب. من التثبيت إلى التدريب.',
    ci_avail: 'التوفر',
    ci_location: 'الموقع',
    ci_location_val: 'الجزائر – خدمة وطنية',
    ci_btn1: '🚀 ابدأ التجربة المجانية',
    ci_btn2: '📲 اطلب عبر واتساب',
    form_title: 'رسالة سريعة',
    f_name: 'اسمك',
    f_phone: 'رقم واتساب',
    f_type: 'نوع التجارة',
    f_msg: 'رسالتك',
    f_ph_name: 'مثال: أحمد بن سالم',
    f_ph_phone: '+213 6XX XX XX XX',
    f_ph_msg: 'أريد تجربة SyncloudPOS...',
    f_send: '📲 أرسل عبر واتساب',
    footer_desc: 'SyncloudPOS — برنامج الكاشير الذكي المصمم للتجارة الجزائرية.',
    fl1: 'المميزات',
    fl2: 'الدعم',
    fl3: 'اللغات',
    copyright: '© 2026 SyncloudPOS. صنع بـ ❤️ في 🇩🇿 الجزائر',
    features_link: 'شاهد كل المميزات ←',
    f_opts_0: 'اختر...',
    f_opts_1: 'هايبر ماركت / مواد غذائية',
    f_opts_2: 'تجارة جملة',
    f_opts_3: 'محل ألبسة',
    f_opts_4: 'صيدلية',
    f_opts_5: 'مواد بناء',
    f_opts_6: 'إلكترونيات',
    f_opts_7: 'ورشة عمل / تصنيع',
    f_opts_8: 'أخرى',
    nav_apps: 'تطبيقات',
    sec_apps_tag: 'تطبيقات الهاتف',
    sec_apps_title: 'تجارتك في جيبك',
    sec_apps_desc: 'تطبيقان مخصصان للمدير والسائق. متوفران على Android و iOS.',
    app1_name: 'SynCloud المدير',
    app1_desc: 'تطبيق المالك. تابع مبيعاتك، أرباحك، ديون العملاء، الخزينة وأداء السائقين — كل شيء من هاتفك.',
    app1_f1: 'لوحة تحكم فورية',
    app1_f2: 'تقارير مبيعات وهوامش',
    app1_f3: 'ديون العملاء',
    app1_f4: 'دفتر الموردين',
    app1_f5: 'إغلاق الصندوق',
    app1_f6: 'مراقبة السائقين GPS',
    app1_f7: 'مشتريات AI (OCR فواتير)',
    app1_f8: 'شيكات و G50',
    app2_name: 'SynCloud التوصيل',
    app2_desc: 'تطبيق سائق الميدان. أدِر الجولات، أنشئ أوراق التوصيل، حصّل المدفوعات والمرتجعات — حتى بدون إنترنت.',
    app2_f1: 'خطة الجولة',
    app2_f2: 'بطاقة عميل ميدانية',
    app2_f3: 'إنشاء BL في الموقع',
    app2_f4: 'تحصيل المدفوعات',
    app2_f5: 'مرتجعات المنتجات',
    app2_f6: 'تحميل الشاحنة',
    app2_f7: 'لوحة تحكم اليوم',
    app2_f8: 'وضع بدون اتصال',
    testi2_quote: '« من يوم ما بديت نستعمل SyncloudPOS، أخطاء المخزون نقصت بنسبة 90%. استيراد Excel وفّرلي 3 أيام عمل. وإرسال الوصولات عبر واتساب؟ زبائني يحبوها! »',
    testi2_name: 'سميرة ك.',
    testi2_role: 'مديرة – بوتيك أزياء، وهران',
    testi3_quote: '« كتاجر جملة، كنت محتاج 3 أسعار مختلفة لكل منتج. SyncloudPOS يتعامل مع هذا بشكل ممتاز. جولات التوصيل وإغلاق الصندوق اليومي غيّرولي حياتي. »',
    testi3_name: 'يوسف م.',
    testi3_role: 'تاجر جملة – توزيع FMCG، سطيف',
  },
};

/* ═══════════════ FEATURE DATA ═══════════════ */
interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}
interface FeatureCategory {
  icon: string;
  gradient: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  items: Record<string, FeatureItem[]>;
}

const FEATURES: FeatureCategory[] = [
  {
    icon: '🛒', gradient: 'linear-gradient(135deg,#6C63FF,#9b35e9)',
    title: { fr: 'Caisse & Ventes (POS)', en: 'POS & Sales', ar: 'الكاشير والمبيعات' },
    desc: { fr: 'Tout pour encaisser rapidement et gérer vos ventes.', en: 'Everything to process sales quickly.', ar: 'كل ما تحتاجه للبيع بسرعة.' },
    items: {
      fr: [
        { icon: '🛒', title: 'Interface POS Rapide', desc: 'Encaissement ultra-rapide avec scan barcode, recherche produit, raccourcis clavier.' },
        { icon: '🔖', title: 'Paiement Partiel / Crédit', desc: 'Paiement en plusieurs fois, suivi des crédits et relances.' },
        { icon: '🧾', title: 'Reçu Thermique', desc: 'Impression ticket personnalisé avec logo, TVA, pied de page.' },
        { icon: '📱', title: 'Envoi Reçu WhatsApp', desc: 'Partagez le ticket de caisse directement via WhatsApp.' },
        { icon: '👤', title: 'Sélection Client en Caisse', desc: 'Associez un client à chaque vente pour suivi crédit et historique.' },
        { icon: '💵', title: 'Multi-Modes de Paiement', desc: 'Espèces, carte, virement, crédit. Combinaison libre.' },
        { icon: '🔁', title: 'Retours & Remboursements', desc: 'Gestion des retours avec remise en stock automatique.' },
        { icon: '📋', title: 'Bon de Commande (BDC)', desc: 'Créez des bons de commande avant facturation finale.' },
        { icon: '🏷️', title: 'Promotions & Remises', desc: 'Promotions (% ou montant fixe) avec dates de validité.' },
        { icon: '📅', title: 'Factures Récurrentes', desc: 'Factures automatiques mensuelles pour clients réguliers.' },
        { icon: '📦', title: 'Réservation avec Acompte', desc: 'Réservez des produits avec versement d\'un acompte.' },
        { icon: '🌙', title: 'Clôture de Journée', desc: 'Récapitulatif quotidien : ventes, bénéfices, crédits, dépenses.' },
      ],
      en: [
        { icon: '🛒', title: 'Fast POS Interface', desc: 'Ultra-fast checkout with barcode scan, product search, keyboard shortcuts.' },
        { icon: '🔖', title: 'Partial Payment / Credit', desc: 'Installment payments, credit tracking and reminders.' },
        { icon: '🧾', title: 'Thermal Receipt', desc: 'Custom ticket printing with logo, VAT, footer.' },
        { icon: '📱', title: 'WhatsApp Receipt', desc: 'Share receipt directly via WhatsApp to customers.' },
        { icon: '👤', title: 'Customer Selection at POS', desc: 'Link each sale to a customer for credit tracking.' },
        { icon: '💵', title: 'Multi-Payment Methods', desc: 'Cash, card, transfer, credit. Free combination.' },
        { icon: '🔁', title: 'Returns & Refunds', desc: 'Return management with automatic re-stocking.' },
        { icon: '📋', title: 'Purchase Orders', desc: 'Create purchase orders before final invoicing.' },
        { icon: '🏷️', title: 'Promotions & Discounts', desc: 'Promotions (% or fixed) with validity dates.' },
        { icon: '📅', title: 'Recurring Invoices', desc: 'Automatic monthly invoices for regular clients.' },
        { icon: '📦', title: 'Reservation with Deposit', desc: 'Reserve products with customer deposit.' },
        { icon: '🌙', title: 'Daily Close', desc: 'Daily summary: sales, profits, credits, expenses.' },
      ],
      ar: [
        { icon: '🛒', title: 'واجهة كاشير سريعة', desc: 'بيع فائق السرعة مع باركود وبحث سريع.' },
        { icon: '🔖', title: 'دفع جزئي / بالدين', desc: 'دفع بالتقسيط ومتابعة الديون.' },
        { icon: '🧾', title: 'وصل حراري', desc: 'طباعة تيكي مخصص مع الشعار والضريبة.' },
        { icon: '📱', title: 'إرسال وصل عبر واتساب', desc: 'شارك الوصل مباشرة عبر واتساب.' },
        { icon: '👤', title: 'اختيار العميل عند البيع', desc: 'ربط كل عملية بيع بعميل لمتابعة الديون.' },
        { icon: '💵', title: 'طرق دفع متعددة', desc: 'نقداً، بطاقة، تحويل، دين.' },
        { icon: '🔁', title: 'إرجاع واسترداد', desc: 'إدارة المرتجعات مع إعادة المخزون.' },
        { icon: '📋', title: 'أوامر الشراء', desc: 'إنشاء أوامر شراء قبل الفوترة.' },
        { icon: '🏷️', title: 'عروض وتخفيضات', desc: 'عروض (% أو مبلغ ثابت) مع تواريخ صلاحية.' },
        { icon: '📅', title: 'فواتير متكررة', desc: 'فواتير شهرية تلقائية للعملاء الدائمين.' },
        { icon: '📦', title: 'حجز مع عربون', desc: 'حجز منتجات مع دفع عربون.' },
        { icon: '🌙', title: 'إغلاق اليوم', desc: 'ملخص يومي: مبيعات، أرباح، ديون، مصاريف.' },
      ],
    },
  },
  {
    icon: '📦', gradient: 'linear-gradient(135deg,#00D4AA,#0094c8)',
    title: { fr: 'Produits & Stock', en: 'Products & Inventory', ar: 'المنتجات والمخزون' },
    desc: { fr: 'Gérez votre catalogue et inventaire avec précision.', en: 'Manage your catalog and inventory precisely.', ar: 'أدِر كتالوجك ومخزونك بدقة.' },
    items: {
      fr: [
        { icon: '📦', title: 'Catalogue Produits Complet', desc: 'Photos, catégories, marques, descriptions, codes-barres.' },
        { icon: '🔢', title: 'Multi-Barcode par Produit', desc: 'Plusieurs codes-barres pour un même article.' },
        { icon: '💰', title: '3 Niveaux de Prix', desc: 'Prix détail, gros et revendeur par produit.' },
        { icon: '📉', title: 'Stock Minimum & Alertes', desc: 'Seuils automatiques et alertes de rupture.' },
        { icon: '📊', title: 'Historique Mouvements Stock', desc: 'Traçabilité : entrées, sorties, ajustements, transferts.' },
        { icon: '📥', title: 'Import Excel', desc: 'Importez produits, clients, fournisseurs depuis Excel.' },
        { icon: '🗑️', title: 'Avaries & Pertes', desc: 'Produits expirés ou avariés. Stock ajusté automatiquement.' },
        { icon: '📅', title: 'Dates de Péremption', desc: 'Suivi des dates pour produits alimentaires.' },
        { icon: '📋', title: 'Inventaire Annuel', desc: "Rapport d'inventaire conforme aux exigences fiscales." },
        { icon: '📃', title: 'Liste de Prix', desc: 'Listes filtrées par catégorie et type de client.' },
        { icon: '🔍', title: "Audit d'Inventaire", desc: 'Comptage physique avec correction des écarts.' },
        { icon: '🔄', title: 'Suggestions Réappro', desc: 'Calcul automatique des quantités à commander.' },
        { icon: '🏷️', title: 'Génération Codes-Barres', desc: 'Créez et imprimez vos propres étiquettes.' },
      ],
      en: [
        { icon: '📦', title: 'Full Product Catalog', desc: 'Photos, categories, brands, descriptions, barcodes.' },
        { icon: '🔢', title: 'Multi-Barcode per Product', desc: 'Multiple barcodes for the same item.' },
        { icon: '💰', title: '3 Price Tiers', desc: 'Retail, wholesale, and reseller price per product.' },
        { icon: '📉', title: 'Stock Alerts', desc: 'Automatic thresholds and out-of-stock alerts.' },
        { icon: '📊', title: 'Stock Movement History', desc: 'Full traceability: in, out, adjustments, transfers.' },
        { icon: '📥', title: 'Excel Import', desc: 'Import products, clients, suppliers from Excel.' },
        { icon: '🗑️', title: 'Spoilage & Loss', desc: 'Track expired/damaged products. Auto stock adjustment.' },
        { icon: '📅', title: 'Expiry Dates', desc: 'Track dates for food and pharma products.' },
        { icon: '📋', title: 'Annual Inventory', desc: 'Inventory report compliant with tax requirements.' },
        { icon: '📃', title: 'Price Lists', desc: 'Filtered by category and customer type.' },
        { icon: '🔍', title: 'Inventory Audit', desc: 'Physical counting with gap correction.' },
        { icon: '🔄', title: 'Reorder Suggestions', desc: 'Auto-calculated order quantities from sales data.' },
        { icon: '🏷️', title: 'Barcode Generation', desc: 'Create and print your own barcode labels.' },
      ],
      ar: [
        { icon: '📦', title: 'كتالوج منتجات كامل', desc: 'صور، فئات، علامات تجارية، باركود.' },
        { icon: '🔢', title: 'باركود متعدد لكل منتج', desc: 'عدة باركود لنفس المنتج.' },
        { icon: '💰', title: '3 مستويات أسعار', desc: 'سعر التجزئة والجملة والموزع.' },
        { icon: '📉', title: 'تنبيهات المخزون', desc: 'حدود تلقائية وتنبيهات نفاد المخزون.' },
        { icon: '📊', title: 'سجل حركة المخزون', desc: 'تتبع كامل: دخول، خروج، تعديلات.' },
        { icon: '📥', title: 'استيراد من Excel', desc: 'استيراد المنتجات والعملاء والموردين.' },
        { icon: '🗑️', title: 'تلف وخسائر', desc: 'تتبع المنتجات التالفة. تعديل تلقائي.' },
        { icon: '📅', title: 'تواريخ الصلاحية', desc: 'متابعة تواريخ المنتجات الغذائية.' },
        { icon: '📋', title: 'جرد سنوي', desc: 'تقرير جرد متوافق مع المتطلبات الضريبية.' },
        { icon: '📃', title: 'قوائم الأسعار', desc: 'مفلترة حسب الفئة ونوع العميل.' },
        { icon: '🔍', title: 'تدقيق المخزون', desc: 'عد فعلي مع تصحيح الفروقات.' },
        { icon: '🔄', title: 'اقتراحات إعادة الطلب', desc: 'حساب تلقائي للكميات المطلوبة.' },
        { icon: '🏷️', title: 'إنشاء باركود', desc: 'أنشئ واطبع ملصقات الباركود.' },
      ],
    },
  },
  {
    icon: '👥', gradient: 'linear-gradient(135deg,#FFD93D,#ff8c00)',
    title: { fr: 'Clients & Fournisseurs', en: 'Clients & Suppliers', ar: 'العملاء والموردون' },
    desc: { fr: 'Gérez vos relations commerciales, crédits et dettes.', en: 'Manage business relationships, credits and debts.', ar: 'أدِر علاقاتك التجارية والديون.' },
    items: {
      fr: [
        { icon: '👥', title: 'Fiches Clients Complètes', desc: 'NIF, NIS, NRC, RIB, adresse, téléphone, email.' },
        { icon: '💳', title: 'Suivi des Dettes Clients', desc: 'Solde impayé, historique paiements, rappels.' },
        { icon: '🏦', title: 'Emprunts Clients', desc: 'Prêts accordés : montant, échéances, remboursements.' },
        { icon: '📈', title: 'Historique Achats Client', desc: 'Tous les achats par client avec détails.' },
        { icon: '🏭', title: 'Gestion Fournisseurs', desc: 'Fiches avec infos fiscales algériennes.' },
        { icon: '📄', title: "Bons d'Achat Fournisseurs", desc: 'Commandes, réceptions, paiements et avances.' },
        { icon: '💸', title: 'Paiements Fournisseurs', desc: 'Suivi paiements, avances et soldes.' },
        { icon: '🏧', title: 'Emprunts Fournisseurs', desc: 'Emprunts auprès fournisseurs avec suivi.' },
        { icon: '🔄', title: 'Transferts Inter-Magasins', desc: 'Transférez du stock entre points de vente.' },
        { icon: '💰', title: 'Commissions & Suivi', desc: "Commissions par vendeur ou apporteur d'affaires." },
      ],
      en: [
        { icon: '👥', title: 'Full Customer Profiles', desc: 'NIF, NIS, NRC, RIB, address, phone, email.' },
        { icon: '💳', title: 'Customer Debt Tracking', desc: 'Outstanding balance, payment history, reminders.' },
        { icon: '🏦', title: 'Customer Loans', desc: 'Loans granted: amount, deadlines, repayments.' },
        { icon: '📈', title: 'Customer Purchase History', desc: 'All purchases by customer with details.' },
        { icon: '🏭', title: 'Supplier Management', desc: 'Profiles with Algerian tax info.' },
        { icon: '📄', title: 'Purchase Orders', desc: 'Orders, receipts, payments and advances.' },
        { icon: '💸', title: 'Supplier Payments', desc: 'Track payments, advances and balances.' },
        { icon: '🏧', title: 'Supplier Loans', desc: 'Loans from suppliers with tracking.' },
        { icon: '🔄', title: 'Inter-Store Transfers', desc: 'Transfer stock between locations.' },
        { icon: '💰', title: 'Commissions & Tracking', desc: 'Commissions per seller or referrer.' },
      ],
      ar: [
        { icon: '👥', title: 'بطاقات عملاء كاملة', desc: 'NIF، NIS، NRC، RIB، عنوان، هاتف.' },
        { icon: '💳', title: 'متابعة ديون العملاء', desc: 'الرصيد المتبقي وتاريخ المدفوعات.' },
        { icon: '🏦', title: 'قروض العملاء', desc: 'قروض ممنوحة: مبلغ، مواعيد، تسديد.' },
        { icon: '📈', title: 'سجل مشتريات العميل', desc: 'كل مشتريات العميل بالتفصيل.' },
        { icon: '🏭', title: 'إدارة الموردين', desc: 'بطاقات مع معلومات جبائية جزائرية.' },
        { icon: '📄', title: 'أوامر شراء الموردين', desc: 'طلبات، استلام، مدفوعات وسلف.' },
        { icon: '💸', title: 'مدفوعات الموردين', desc: 'متابعة المدفوعات والسلف والأرصدة.' },
        { icon: '🏧', title: 'قروض الموردين', desc: 'قروض من الموردين مع متابعة.' },
        { icon: '🔄', title: 'تحويلات بين المحلات', desc: 'حوّل المخزون بين نقاط البيع.' },
        { icon: '💰', title: 'عمولات ومتابعة', desc: 'عمولات لكل بائع أو وسيط.' },
      ],
    },
  },
  {
    icon: '💰', gradient: 'linear-gradient(135deg,#FF6B6B,#c71562)',
    title: { fr: 'Finance & Trésorerie', en: 'Finance & Treasury', ar: 'المالية والخزينة' },
    desc: { fr: 'Contrôlez vos flux financiers en temps réel.', en: 'Control your financial flows in real time.', ar: 'تحكم في تدفقاتك المالية.' },
    items: {
      fr: [
        { icon: '💰', title: 'Multi-Caisses', desc: 'Plusieurs caisses liées à différents points de vente.' },
        { icon: '🏦', title: 'Comptes Bancaires', desc: 'Suivez soldes et mouvements de vos comptes.' },
        { icon: '🔄', title: 'Virements Internes', desc: 'Transferts entre caisses et comptes en un clic.' },
        { icon: '💸', title: 'Gestion des Dépenses', desc: 'Catégorisez dépenses (loyer, salaires, etc.).' },
        { icon: '📊', title: 'Vue Trésorerie Globale', desc: 'Soldes de toutes les caisses en temps réel.' },
        { icon: '🧾', title: 'Historique Transactions', desc: 'Chaque mouvement financier est tracé.' },
        { icon: '📒', title: 'Grand Livre (Ledger)', desc: 'Journal comptable complet.' },
        { icon: '🏦', title: 'Emprunts & Remboursements', desc: 'Suivi emprunts avec échéances.' },
      ],
      en: [
        { icon: '💰', title: 'Multi-Registers', desc: 'Multiple registers linked to different locations.' },
        { icon: '🏦', title: 'Bank Accounts', desc: 'Track balances and movements.' },
        { icon: '🔄', title: 'Internal Transfers', desc: 'One-click transfers between registers and accounts.' },
        { icon: '💸', title: 'Expense Management', desc: 'Categorize expenses (rent, salaries, etc.).' },
        { icon: '📊', title: 'Treasury Overview', desc: 'Real-time balances of all registers.' },
        { icon: '🧾', title: 'Transaction History', desc: 'Every financial movement tracked.' },
        { icon: '📒', title: 'General Ledger', desc: 'Complete accounting journal.' },
        { icon: '🏦', title: 'Loans & Repayments', desc: 'Track loans with deadlines.' },
      ],
      ar: [
        { icon: '💰', title: 'صناديق متعددة', desc: 'عدة صناديق مرتبطة بنقاط بيع مختلفة.' },
        { icon: '🏦', title: 'حسابات بنكية', desc: 'تتبع الأرصدة والحركات.' },
        { icon: '🔄', title: 'تحويلات داخلية', desc: 'تحويلات بين الصناديق والحسابات.' },
        { icon: '💸', title: 'إدارة المصاريف', desc: 'تصنيف المصاريف (إيجار، رواتب...).' },
        { icon: '📊', title: 'نظرة شاملة على الخزينة', desc: 'أرصدة كل الصناديق لحظياً.' },
        { icon: '🧾', title: 'سجل المعاملات', desc: 'كل حركة مالية مسجلة.' },
        { icon: '📒', title: 'دفتر الأستاذ', desc: 'سجل محاسبي كامل.' },
        { icon: '🏦', title: 'قروض وتسديدات', desc: 'متابعة القروض مع المواعيد.' },
      ],
    },
  },
  {
    icon: '📊', gradient: 'linear-gradient(135deg,#4FC3F7,#006699)',
    title: { fr: 'Rapports & Analytiques', en: 'Reports & Analytics', ar: 'التقارير والتحليلات' },
    desc: { fr: 'Prenez de meilleures décisions grâce aux données.', en: 'Make better decisions with data.', ar: 'اتخذ قرارات أفضل بالبيانات.' },
    items: {
      fr: [
        { icon: '📊', title: 'Dashboard Temps Réel', desc: "CA, bénéfice net, COGS, marges en un coup d'œil." },
        { icon: '📈', title: 'Évolution des Ventes', desc: 'Graphiques par jour, semaine, mois.' },
        { icon: '🏆', title: 'Top Produits', desc: 'Classement par ventes et bénéfices.' },
        { icon: '👥', title: 'Rapports par Client', desc: 'Ventes, crédits, historique détaillé.' },
        { icon: '📉', title: 'Rapports Financiers', desc: 'Revenus, dépenses, bénéfice brut et net.' },
        { icon: '🛒', title: 'Rapports Ventes', desc: 'Détail avec filtres période, vendeur, magasin.' },
        { icon: '📦', title: 'Rapports Achats', desc: 'Analyse par fournisseur, période, produit.' },
        { icon: '📋', title: 'Rapports Inventaire', desc: 'État du stock, valeur, ruptures.' },
        { icon: '💰', title: 'Rapports Trésorerie', desc: 'Flux de caisse, historique, soldes.' },
        { icon: '🌙', title: 'Clôture de Journée', desc: 'Rapport fin de journée complet.' },
        { icon: '🖨️', title: 'Export PDF & Impression', desc: 'Exportez en PDF ou imprimez.' },
      ],
      en: [
        { icon: '📊', title: 'Real-Time Dashboard', desc: 'Revenue, net profit, COGS, margins at a glance.' },
        { icon: '📈', title: 'Sales Trends', desc: 'Charts by day, week, month.' },
        { icon: '🏆', title: 'Top Products', desc: 'Ranked by sales and profits.' },
        { icon: '👥', title: 'Client Reports', desc: 'Sales, credits, detailed history.' },
        { icon: '📉', title: 'Financial Reports', desc: 'Revenue, expenses, gross and net profit.' },
        { icon: '🛒', title: 'Sales Reports', desc: 'Detailed with period, seller, store filters.' },
        { icon: '📦', title: 'Purchase Reports', desc: 'Analysis by supplier, period, product.' },
        { icon: '📋', title: 'Inventory Reports', desc: 'Stock status, value, shortages.' },
        { icon: '💰', title: 'Treasury Reports', desc: 'Cash flow, history, balances.' },
        { icon: '🌙', title: 'Daily Close', desc: 'Complete end-of-day report.' },
        { icon: '🖨️', title: 'PDF Export & Print', desc: 'Export to PDF or print directly.' },
      ],
      ar: [
        { icon: '📊', title: 'لوحة تحكم فورية', desc: 'رقم الأعمال، الربح، الهوامش فوراً.' },
        { icon: '📈', title: 'تطور المبيعات', desc: 'رسومات حسب اليوم والأسبوع والشهر.' },
        { icon: '🏆', title: 'أفضل المنتجات', desc: 'ترتيب حسب المبيعات والأرباح.' },
        { icon: '👥', title: 'تقارير العملاء', desc: 'مبيعات وديون وسجل مفصل.' },
        { icon: '📉', title: 'تقارير مالية', desc: 'إيرادات، مصاريف، ربح صافي.' },
        { icon: '🛒', title: 'تقارير المبيعات', desc: 'تفصيل مع فلاتر الفترة والبائع.' },
        { icon: '📦', title: 'تقارير المشتريات', desc: 'تحليل حسب المورد والفترة.' },
        { icon: '📋', title: 'تقارير المخزون', desc: 'حالة المخزون والقيمة والنواقص.' },
        { icon: '💰', title: 'تقارير الخزينة', desc: 'تدفق نقدي وسجل وأرصدة.' },
        { icon: '🌙', title: 'إغلاق اليوم', desc: 'تقرير نهاية يوم كامل.' },
        { icon: '🖨️', title: 'تصدير PDF وطباعة', desc: 'صدّر كـPDF أو اطبع مباشرة.' },
      ],
    },
  },
  {
    icon: '🤖', gradient: 'linear-gradient(135deg,#A855F7,#6366F1)',
    title: { fr: 'Intelligence Artificielle', en: 'Artificial Intelligence', ar: 'الذكاء الاصطناعي' },
    desc: { fr: 'Des outils IA pour automatiser et booster votre commerce.', en: 'AI tools to automate and boost your business.', ar: 'أدوات ذكاء اصطناعي لتعزيز تجارتك.' },
    items: {
      fr: [
        { icon: '🤖', title: 'Chat IA Intégré', desc: 'Posez des questions en langage naturel. Multi-fournisseurs IA.' },
        { icon: '📸', title: 'OCR Factures', desc: "Scannez factures d'achat et importez automatiquement." },
        { icon: '📈', title: 'Prévisions de Ventes', desc: "L'IA prédit vos ventes futures." },
        { icon: '💡', title: 'Suggestions Intelligentes', desc: "Recommandations basées sur vos données." },
        { icon: '🔔', title: 'Alertes Intelligentes', desc: 'Notifications : stock bas, crédits impayés.' },
      ],
      en: [
        { icon: '🤖', title: 'Built-in AI Chat', desc: 'Ask questions in natural language. Multi-provider AI.' },
        { icon: '📸', title: 'Invoice OCR', desc: 'Scan purchase invoices and auto-import data.' },
        { icon: '📈', title: 'Sales Forecasting', desc: 'AI predicts your future sales.' },
        { icon: '💡', title: 'Smart Suggestions', desc: 'Recommendations based on your data.' },
        { icon: '🔔', title: 'Smart Alerts', desc: 'Notifications: low stock, unpaid credits.' },
      ],
      ar: [
        { icon: '🤖', title: 'دردشة ذكاء اصطناعي', desc: 'اطرح أسئلة بلغة طبيعية.' },
        { icon: '📸', title: 'قراءة فواتير OCR', desc: 'امسح الفواتير واستورد البيانات تلقائياً.' },
        { icon: '📈', title: 'توقع المبيعات', desc: 'الذكاء الاصطناعي يتوقع مبيعاتك.' },
        { icon: '💡', title: 'اقتراحات ذكية', desc: 'توصيات مبنية على بياناتك.' },
        { icon: '🔔', title: 'تنبيهات ذكية', desc: 'إشعارات: مخزون منخفض، ديون.' },
      ],
    },
  },
  {
    icon: '⚙️', gradient: 'linear-gradient(135deg,#78909C,#37474F)',
    title: { fr: 'Système & Administration', en: 'System & Admin', ar: 'النظام والإدارة' },
    desc: { fr: 'Configuration avancée, sécurité et multi-utilisateurs.', en: 'Advanced config, security, multi-user.', ar: 'إعدادات متقدمة وأمان ومستخدمين متعددين.' },
    items: {
      fr: [
        { icon: '🔒', title: 'Permissions Vendeurs', desc: 'Droits granulaires : lecture, modification, suppression.' },
        { icon: '🏪', title: 'Multi-Magasins', desc: 'Plusieurs points de vente, stocks séparés.' },
        { icon: '🌍', title: 'Multi-Langues', desc: 'Interface FR, AR, EN. Changez à tout moment.' },
        { icon: '⚙️', title: 'Paramètres Personnalisés', desc: 'Logo, infos, format reçu, thème sombre/clair.' },
        { icon: '📱', title: 'Responsive', desc: "PC, tablette, mobile — n'importe quel appareil." },
        { icon: '☁️', title: 'Cloud & Local', desc: 'En ligne et hors-ligne avec synchro.' },
        { icon: '💾', title: 'Sauvegarde & Restauration', desc: 'Sauvegardez et restaurez vos données.' },
        { icon: '📲', title: 'Intégration WhatsApp', desc: 'Reçus, factures et relances via WhatsApp.' },
        { icon: '🚚', title: 'Intégration Livraison', desc: 'DHD, HDD, Yalidine et autres.' },
        { icon: '🔐', title: 'Vérification OTP', desc: 'Sécurisation par code OTP.' },
        { icon: '🌙', title: 'Mode Ramadan', desc: 'Horaires et paramètres adaptés.' },
        { icon: '📝', title: 'Formation Intégrée', desc: 'Guides étape par étape.' },
      ],
      en: [
        { icon: '🔒', title: 'Role Permissions', desc: 'Granular rights: read, edit, delete.' },
        { icon: '🏪', title: 'Multi-Store', desc: 'Multiple locations, separate stocks.' },
        { icon: '🌍', title: 'Multi-Language', desc: 'UI in FR, AR, EN. Switch anytime.' },
        { icon: '⚙️', title: 'Custom Settings', desc: 'Logo, info, receipt format, dark/light theme.' },
        { icon: '📱', title: 'Responsive', desc: 'PC, tablet, mobile — any device.' },
        { icon: '☁️', title: 'Cloud & Local', desc: 'Online and offline with sync.' },
        { icon: '💾', title: 'Backup & Restore', desc: 'Save and restore your data.' },
        { icon: '📲', title: 'WhatsApp Integration', desc: 'Receipts, invoices and reminders via WhatsApp.' },
        { icon: '🚚', title: 'Delivery Integration', desc: 'DHD, HDD, Yalidine and more.' },
        { icon: '🔐', title: 'OTP Verification', desc: 'Security via OTP code.' },
        { icon: '🌙', title: 'Ramadan Mode', desc: 'Adapted schedules and settings.' },
        { icon: '📝', title: 'Built-in Training', desc: 'Step-by-step guides.' },
      ],
      ar: [
        { icon: '🔒', title: 'صلاحيات الموظفين', desc: 'حقوق دقيقة: قراءة، تعديل، حذف.' },
        { icon: '🏪', title: 'محلات متعددة', desc: 'عدة نقاط بيع بمخزون منفصل.' },
        { icon: '🌍', title: 'متعدد اللغات', desc: 'واجهة بالعربية والفرنسية والإنجليزية.' },
        { icon: '⚙️', title: 'إعدادات مخصصة', desc: 'شعار، معلومات، نموذج وصل.' },
        { icon: '📱', title: 'متجاوب', desc: 'كمبيوتر، تابلت، هاتف.' },
        { icon: '☁️', title: 'سحابي ومحلي', desc: 'أونلاين وأوفلاين مع مزامنة.' },
        { icon: '💾', title: 'نسخ احتياطي واستعادة', desc: 'احفظ واسترد بياناتك.' },
        { icon: '📲', title: 'تكامل واتساب', desc: 'وصولات وفواتير عبر واتساب.' },
        { icon: '🚚', title: 'تكامل التوصيل', desc: 'DHD، HDD، Yalidine وغيرها.' },
        { icon: '🔐', title: 'تحقق OTP', desc: 'أمان عبر رمز OTP.' },
        { icon: '🌙', title: 'وضع رمضان', desc: 'أوقات وإعدادات مكيّفة.' },
        { icon: '📝', title: 'تدريب مدمج', desc: 'أدلة خطوة بخطوة.' },
      ],
    },
  },
  {
    icon: '🇩🇿', gradient: 'linear-gradient(135deg,#00897B,#006064)',
    title: { fr: 'Conformité Algérienne', en: 'Algerian Compliance', ar: 'التوافق الجزائري' },
    desc: { fr: 'Adapté aux exigences fiscales et commerciales algériennes.', en: 'Adapted to Algerian tax and business requirements.', ar: 'متوافق مع المتطلبات الجبائية الجزائرية.' },
    items: {
      fr: [
        { icon: '🇩🇿', title: 'NIF / NIS / NRC / RIB', desc: 'Champs fiscaux algériens intégrés.' },
        { icon: '🧾', title: 'Reçu Conforme', desc: 'Tickets conformes à la réglementation.' },
        { icon: '📋', title: 'Inventaire Annuel Légal', desc: "Rapport conforme aux obligations fiscales." },
        { icon: '💱', title: 'Devise DZD', desc: 'Tarification en Dinar Algérien.' },
        { icon: '📊', title: 'Déclaration G12', desc: 'Génération automatique G12.' },
        { icon: '📄', title: 'Déclaration G50', desc: 'Génération automatique G50.' },
        { icon: '🚚', title: 'Livraison Locale', desc: 'DHD, HDD, Yalidine intégrés.' },
      ],
      en: [
        { icon: '🇩🇿', title: 'NIF / NIS / NRC / RIB', desc: 'Algerian tax fields built-in.' },
        { icon: '🧾', title: 'Compliant Receipts', desc: 'Tickets compliant with regulations.' },
        { icon: '📋', title: 'Legal Annual Inventory', desc: 'Report meeting tax requirements.' },
        { icon: '💱', title: 'DZD Currency', desc: 'Pricing in Algerian Dinar.' },
        { icon: '📊', title: 'G12 Declaration', desc: 'Auto-generated G12 tax report.' },
        { icon: '📄', title: 'G50 Declaration', desc: 'Auto-generated G50 tax report.' },
        { icon: '🚚', title: 'Local Delivery', desc: 'DHD, HDD, Yalidine integrated.' },
      ],
      ar: [
        { icon: '🇩🇿', title: 'NIF / NIS / NRC / RIB', desc: 'حقول جبائية جزائرية مدمجة.' },
        { icon: '🧾', title: 'وصل متوافق', desc: 'تذاكر متوافقة مع القانون.' },
        { icon: '📋', title: 'جرد سنوي قانوني', desc: 'تقرير متوافق مع المتطلبات الجبائية.' },
        { icon: '💱', title: 'عملة الدينار', desc: 'تسعير بالدينار الجزائري.' },
        { icon: '📊', title: 'تصريح G12', desc: 'إنشاء تلقائي لـ G12.' },
        { icon: '📄', title: 'تصريح G50', desc: 'إنشاء تلقائي لـ G50.' },
        { icon: '🚚', title: 'توصيل محلي', desc: 'DHD، HDD، Yalidine مدمجة.' },
      ],
    },
  },
  {
    icon: '📱', gradient: 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
    title: { fr: 'Applications Mobiles', en: 'Mobile Apps', ar: 'تطبيقات الهاتف' },
    desc: { fr: 'Gérez votre commerce depuis votre téléphone avec nos apps dédiées.', en: 'Manage your business from your phone with dedicated apps.', ar: 'أدِر تجارتك من هاتفك مع تطبيقاتنا المخصصة.' },
    items: {
      fr: [
        { icon: '📊', title: 'SynCloud Gérant', desc: 'Application mobile pour le gérant : dashboard, rapports ventes, marges, créances clients, clôture de caisse.' },
        { icon: '🚛', title: 'SynCloud Tournée', desc: 'Application mobile pour les livreurs : tournées, clients, création BL, encaissement, retours produits.' },
        { icon: '📈', title: 'Dashboard Mobile Gérant', desc: "Chiffre d'affaires, bénéfices, dépenses et flux de trésorerie en temps réel sur votre téléphone." },
        { icon: '🗺️', title: 'Suivi GPS Livreurs', desc: 'Suivez vos livreurs en temps réel sur une carte. Historique des déplacements.' },
        { icon: '📄', title: 'Création BL Terrain', desc: 'Créez des bons de livraison directement chez le client depuis le téléphone du livreur.' },
        { icon: '💵', title: 'Encaissement Terrain', desc: 'Les livreurs encaissent les paiements sur le terrain avec mise à jour instantanée.' },
        { icon: '🔄', title: 'Retours Terrain', desc: 'Gestion des retours produits directement depuis le terrain.' },
        { icon: '🚚', title: 'Chargement Camion', desc: 'Le livreur voit et valide le chargement de son camion avant de partir en tournée.' },
        { icon: '📊', title: 'Rapports Gérant Mobile', desc: 'Ventes & revenus, marges & rentabilité, créances clients, grand livre fournisseurs.' },
        { icon: '📸', title: 'Achats AI (OCR Mobile)', desc: 'Photographiez les factures fournisseurs et importez-les automatiquement via IA.' },
        { icon: '🔔', title: 'Monitoring Livreurs', desc: 'Performance livreurs : taux de livraison, montants collectés, retours.' },
        { icon: '💰', title: 'Gestion Chèques Mobile', desc: 'Suivi des chèques encaissés et émis depuis votre téléphone.' },
        { icon: '📋', title: 'Déclaration G50 Mobile', desc: 'Consultez et préparez votre déclaration fiscale G50 depuis votre mobile.' },
        { icon: '🏥', title: 'Santé du Stock Mobile', desc: 'État du stock, produits en rupture, valeur du stock depuis votre téléphone.' },
        { icon: '🔌', title: 'Mode Hors-Ligne', desc: 'Les apps fonctionnent même sans connexion internet avec synchronisation automatique.' },
      ],
      en: [
        { icon: '📊', title: 'SynCloud Manager', desc: 'Mobile app for owners: dashboard, sales reports, margins, client debts, daily close.' },
        { icon: '🚛', title: 'SynCloud Tournée', desc: 'Mobile app for drivers: routes, clients, delivery notes, payments, returns.' },
        { icon: '📈', title: 'Mobile Manager Dashboard', desc: 'Revenue, profits, expenses and cash flow in real-time on your phone.' },
        { icon: '🗺️', title: 'Driver GPS Tracking', desc: 'Track drivers in real-time on a map. Movement history.' },
        { icon: '📄', title: 'Field Delivery Notes', desc: 'Create delivery notes at the customer site from driver phone.' },
        { icon: '💵', title: 'Field Collection', desc: 'Drivers collect payments in the field with instant sync.' },
        { icon: '🔄', title: 'Field Returns', desc: 'Handle product returns directly from the field.' },
        { icon: '🚚', title: 'Truck Loading', desc: 'Driver views and validates truck load before starting route.' },
        { icon: '📊', title: 'Mobile Manager Reports', desc: 'Sales & revenue, margins & profitability, client debts, supplier ledger.' },
        { icon: '📸', title: 'AI Purchases (Mobile OCR)', desc: 'Photo supplier invoices and auto-import via AI.' },
        { icon: '🔔', title: 'Driver Monitoring', desc: 'Driver performance: delivery rate, collected amounts, returns.' },
        { icon: '💰', title: 'Mobile Cheque Manager', desc: 'Track received and issued cheques from your phone.' },
        { icon: '📋', title: 'Mobile G50 Declaration', desc: 'View and prepare your G50 tax declaration from mobile.' },
        { icon: '🏥', title: 'Mobile Stock Health', desc: 'Stock status, out-of-stock products, stock value from your phone.' },
        { icon: '🔌', title: 'Offline Mode', desc: 'Apps work without internet with automatic sync.' },
      ],
      ar: [
        { icon: '📊', title: 'SynCloud المدير', desc: 'تطبيق للمدير: لوحة تحكم، تقارير مبيعات، هوامش، ديون العملاء، إغلاق الصندوق.' },
        { icon: '🚛', title: 'SynCloud التوصيل', desc: 'تطبيق للسائقين: مسارات، عملاء، إنشاء BL، تحصيل، مرتجعات.' },
        { icon: '📈', title: 'لوحة تحكم المدير', desc: 'رقم الأعمال والأرباح والمصاريف لحظياً من هاتفك.' },
        { icon: '🗺️', title: 'تتبع GPS السائقين', desc: 'تتبع السائقين على الخريطة. سجل التنقلات.' },
        { icon: '📄', title: 'إنشاء BL ميداني', desc: 'أنشئ أوراق التوصيل عند العميل من هاتف السائق.' },
        { icon: '💵', title: 'تحصيل ميداني', desc: 'السائقون يحصّلون المدفوعات ميدانياً مع مزامنة فورية.' },
        { icon: '🔄', title: 'مرتجعات ميدانية', desc: 'إدارة مرتجعات المنتجات من الميدان.' },
        { icon: '🚚', title: 'تحميل الشاحنة', desc: 'السائق يشاهد ويصادق على حمولة الشاحنة.' },
        { icon: '📊', title: 'تقارير المدير المحمول', desc: 'مبيعات وإيرادات، هوامش، ديون عملاء، دفتر الموردين.' },
        { icon: '📸', title: 'مشتريات AI (OCR)', desc: 'صوّر فواتير الموردين واستوردها تلقائياً بالذكاء الاصطناعي.' },
        { icon: '🔔', title: 'مراقبة السائقين', desc: 'أداء السائقين: معدل التوصيل، مبالغ محصلة، مرتجعات.' },
        { icon: '💰', title: 'إدارة شيكات محمولة', desc: 'متابعة الشيكات المستلمة والمصدرة من هاتفك.' },
        { icon: '📋', title: 'تصريح G50 محمول', desc: 'استعرض وأعد تصريح G50 من هاتفك.' },
        { icon: '🏥', title: 'صحة المخزون المحمول', desc: 'حالة المخزون والنواقص والقيمة من هاتفك.' },
        { icon: '🔌', title: 'وضع بدون اتصال', desc: 'التطبيقات تعمل بدون إنترنت مع مزامنة تلقائية.' },
      ],
    },
  },
  {
    icon: '🚚', gradient: 'linear-gradient(135deg,#F59E0B,#D97706)',
    title: { fr: 'Livraison & Logistique', en: 'Delivery & Logistics', ar: 'التوصيل واللوجستيك' },
    desc: { fr: 'Expédiez vos colis avec les transporteurs algériens intégrés.', en: 'Ship parcels with integrated Algerian carriers.', ar: 'أرسل طرودك مع شركات النقل الجزائرية المدمجة.' },
    items: {
      fr: [
        { icon: '🚀', title: 'Yalidine Intégré', desc: 'Créez vos colis Yalidine directement depuis SyncloudPOS. Tracking automatique.' },
        { icon: '🟡', title: 'DHD Livraison', desc: 'Intégration DHD : création de colis, suivi de statut, COD.' },
        { icon: '🔴', title: 'HDD Express', desc: 'Expédiez via HDD Express avec suivi en temps réel.' },
        { icon: '🟢', title: 'Procolis & Zr Express', desc: 'Support des transporteurs Procolis et Zr Express.' },
        { icon: '📦', title: 'Gestion des Colis', desc: 'Tableau de bord complet : colis en attente, en transit, livrés, retournés.' },
        { icon: '💵', title: 'Contre-Remboursement (COD)', desc: 'Montant à encaisser à la livraison avec suivi automatique en trésorerie.' },
        { icon: '🗺️', title: '58 Wilayas Couvertes', desc: 'Livraison dans les 58 wilayas avec sélection commune.' },
        { icon: '🔄', title: 'Synchronisation Statuts', desc: 'Sync automatique des statuts avec les API transporteurs.' },
        { icon: '🚛', title: 'Tournées de Livraison', desc: 'Planifiez des tournées pour vos propres livreurs avec itinéraires optimisés.' },
        { icon: '📊', title: 'Tableau de Bord Livraison', desc: 'Total colis, en cours, livrés, retournés — statistiques en temps réel.' },
      ],
      en: [
        { icon: '🚀', title: 'Yalidine Integrated', desc: 'Create Yalidine parcels directly from SyncloudPOS. Auto tracking.' },
        { icon: '🟡', title: 'DHD Delivery', desc: 'DHD integration: parcel creation, status tracking, COD.' },
        { icon: '🔴', title: 'HDD Express', desc: 'Ship via HDD Express with real-time tracking.' },
        { icon: '🟢', title: 'Procolis & Zr Express', desc: 'Support for Procolis and Zr Express carriers.' },
        { icon: '📦', title: 'Parcel Management', desc: 'Full dashboard: pending, in transit, delivered, returned parcels.' },
        { icon: '💵', title: 'Cash on Delivery (COD)', desc: 'Amount to collect on delivery with auto treasury tracking.' },
        { icon: '🗺️', title: '58 Wilayas Covered', desc: 'Delivery to all 58 wilayas with commune selection.' },
        { icon: '🔄', title: 'Status Sync', desc: 'Auto status sync with carrier APIs.' },
        { icon: '🚛', title: 'Delivery Routes', desc: 'Plan routes for your own drivers with optimized itineraries.' },
        { icon: '📊', title: 'Delivery Dashboard', desc: 'Total parcels, in progress, delivered, returned — real-time stats.' },
      ],
      ar: [
        { icon: '🚀', title: 'Yalidine مدمج', desc: 'أنشئ طرود Yalidine مباشرة. تتبع تلقائي.' },
        { icon: '🟡', title: 'DHD توصيل', desc: 'تكامل DHD: إنشاء طرود، تتبع الحالة، COD.' },
        { icon: '🔴', title: 'HDD Express', desc: 'أرسل عبر HDD Express مع تتبع لحظي.' },
        { icon: '🟢', title: 'Procolis & Zr Express', desc: 'دعم شركات Procolis و Zr Express.' },
        { icon: '📦', title: 'إدارة الطرود', desc: 'لوحة كاملة: قيد الانتظار، في الطريق، تم التوصيل، مرتجع.' },
        { icon: '💵', title: 'الدفع عند الاستلام (COD)', desc: 'مبلغ التحصيل عند التوصيل مع تتبع تلقائي في الخزينة.' },
        { icon: '🗺️', title: '58 ولاية مغطاة', desc: 'توصيل لكل الولايات الـ58 مع اختيار البلدية.' },
        { icon: '🔄', title: 'مزامنة الحالات', desc: 'مزامنة تلقائية مع API شركات النقل.' },
        { icon: '🚛', title: 'جولات التوصيل', desc: 'خطط مسارات لسائقيك مع مسارات محسّنة.' },
        { icon: '📊', title: 'لوحة تحكم التوصيل', desc: 'إجمالي الطرود، جاري، تم التوصيل، مرتجع — إحصائيات لحظية.' },
      ],
    },
  },
  {
    icon: '📃', gradient: 'linear-gradient(135deg,#EC4899,#BE185D)',
    title: { fr: 'Catalogue & Documents', en: 'Catalog & Documents', ar: 'الكتالوج والوثائق' },
    desc: { fr: 'Catalogue de vente en ligne, factures proforma, et gestion documentaire.', en: 'Online sales catalog, proforma invoices, and document management.', ar: 'كتالوج بيع إلكتروني، فواتير شكلية، وإدارة الوثائق.' },
    items: {
      fr: [
        { icon: '🛍️', title: 'Catalogue de Vente', desc: 'Catalogue interactif et mobile-friendly pour vos commerciaux. Partagez par lien ou QR code.' },
        { icon: '📑', title: 'Factures Proforma', desc: 'Créez des devis et factures proforma professionnels envoyés par email ou WhatsApp.' },
        { icon: '📄', title: 'Bons de Livraison (BL)', desc: 'Bons de livraison avec numérotation automatique et suivi complet.' },
        { icon: '🧾', title: 'Factures Professionnelles', desc: 'Factures conformes avec NIF, NIS, TVA, timbre fiscal et QR code.' },
        { icon: '📲', title: 'Envoi Documents WhatsApp', desc: 'Envoyez factures, BL et reçus directement par WhatsApp aux clients.' },
        { icon: '📧', title: 'Envoi Documents Email', desc: 'Envoyez vos documents commerciaux par email en un clic.' },
        { icon: '💳', title: 'Gestion des Chèques', desc: 'Suivi des chèques reçus et émis avec dates d\'encaissement et alertes.' },
        { icon: '📊', title: 'Rapport Âge des Créances', desc: "Analyse de l'ancienneté des dettes clients : 0-30j, 30-60j, 60-90j, 90j+." },
        { icon: '📥', title: 'Export Excel & PDF', desc: 'Exportez listes clients, produits, ventes et rapports en Excel ou PDF.' },
        { icon: '🖨️', title: 'Impression Multi-Format', desc: 'Imprimez tickets thermiques 58/80mm, A4, étiquettes codes-barres.' },
      ],
      en: [
        { icon: '🛍️', title: 'Sales Catalog', desc: 'Interactive mobile-friendly catalog for your sales team. Share via link or QR code.' },
        { icon: '📑', title: 'Proforma Invoices', desc: 'Create professional quotes and proforma invoices sent via email or WhatsApp.' },
        { icon: '📄', title: 'Delivery Notes (BL)', desc: 'Delivery notes with auto numbering and full tracking.' },
        { icon: '🧾', title: 'Professional Invoices', desc: 'Compliant invoices with NIF, NIS, VAT, stamp tax and QR code.' },
        { icon: '📲', title: 'WhatsApp Documents', desc: 'Send invoices, delivery notes and receipts via WhatsApp.' },
        { icon: '📧', title: 'Email Documents', desc: 'Send commercial documents by email in one click.' },
        { icon: '💳', title: 'Cheque Management', desc: 'Track received and issued cheques with deposit dates and alerts.' },
        { icon: '📊', title: 'Aging Report', desc: 'Analyze client debt age: 0-30d, 30-60d, 60-90d, 90d+.' },
        { icon: '📥', title: 'Excel & PDF Export', desc: 'Export client lists, products, sales and reports to Excel or PDF.' },
        { icon: '🖨️', title: 'Multi-Format Print', desc: 'Print thermal tickets 58/80mm, A4, barcode labels.' },
      ],
      ar: [
        { icon: '🛍️', title: 'كتالوج بيع', desc: 'كتالوج تفاعلي متوافق مع الهاتف لفريق المبيعات. شاركه برابط أو QR.' },
        { icon: '📑', title: 'فواتير شكلية', desc: 'أنشئ عروض أسعار وفواتير شكلية احترافية.' },
        { icon: '📄', title: 'أوراق التوصيل (BL)', desc: 'أوراق توصيل بترقيم تلقائي وتتبع كامل.' },
        { icon: '🧾', title: 'فواتير احترافية', desc: 'فواتير متوافقة مع NIF، NIS، TVA، طابع جبائي و QR.' },
        { icon: '📲', title: 'إرسال وثائق واتساب', desc: 'أرسل الفواتير وأوراق التوصيل عبر واتساب.' },
        { icon: '📧', title: 'إرسال وثائق بالبريد', desc: 'أرسل وثائقك التجارية بالبريد بنقرة واحدة.' },
        { icon: '💳', title: 'إدارة الشيكات', desc: 'تتبع الشيكات المستلمة والمصدرة مع تواريخ وتنبيهات.' },
        { icon: '📊', title: 'تقرير عمر الديون', desc: 'تحليل قِدم ديون العملاء: 0-30 يوم، 30-60، 60-90، +90.' },
        { icon: '📥', title: 'تصدير Excel و PDF', desc: 'صدّر قوائم العملاء والمنتجات والمبيعات كـ Excel أو PDF.' },
        { icon: '🖨️', title: 'طباعة متعددة', desc: 'اطبع تيكيات حرارية 58/80mm، A4، ملصقات باركود.' },
      ],
    },
  },
];

/* ═══════════════ USE CASES DATA ═══════════════ */
interface UseCase {
  icon: string;
  title: Record<string, string>;
  desc: Record<string, string>;
  list: Record<string, string[]>;
}

const USE_CASES: UseCase[] = [
  {
    icon: '🛒',
    title: { fr: 'Hypermarchés & Supermarchés', en: 'Hypermarkets & Supermarkets', ar: 'هايبر ماركت وسوبرماركت' },
    desc: { fr: 'Encaissement ultra-rapide pour flux intenses avec scan barcode, gestion multi-caisses, dates de péremption et stocks.', en: 'Ultra-fast checkout for high volumes with barcode scan, multi-register management, expiry dates and stock tracking.', ar: 'بيع فائق السرعة للمعاملات الكثيفة مع مسح الباركود، إدارة الصناديق المتعددة وتتبع المخزون.' },
    list: {
      fr: ["Scan centaines d'articles/heure", 'Gestion avaries & périmés', 'Tickets thermiques', 'Alertes stock minimum'],
      en: ['Scan hundreds of items/hour', 'Spoilage & expiry management', 'Thermal tickets', 'Low stock alerts'],
      ar: ['مسح مئات المنتجات/ساعة', 'إدارة التلف والانتهاء', 'تذاكر حرارية', 'تنبيهات مخزون منخفض'],
    },
  },
  {
    icon: '🏭',
    title: { fr: 'Grossistes & Distributeurs', en: 'Wholesalers & Distributors', ar: 'تجار الجملة والموزعون' },
    desc: { fr: 'Multi-tarifs. Suivi crédits clients. Bons de livraison.', en: 'Multi-pricing. Client credit tracking. Delivery notes.', ar: 'أسعار متعددة. متابعة ديون العملاء.' },
    list: {
      fr: ['Prix gros / détail / revendeur', 'Bons de livraison', 'Crédits & paiements partiels', 'Rapports par client'],
      en: ['Wholesale / retail / reseller price', 'Delivery notes', 'Credits & partial payments', 'Client reports'],
      ar: ['سعر الجملة/التجزئة/الموزع', 'أوراق التوصيل', 'ديون ودفع جزئي', 'تقارير العملاء'],
    },
  },
  {
    icon: '👕',
    title: { fr: 'Boutiques & Commerce', en: 'Shops & Retail', ar: 'محلات وتجارة' },
    desc: { fr: 'Analyse meilleures ventes, retours clients, suivi CA.', en: 'Best sellers analysis, returns, revenue tracking.', ar: 'تحليل أفضل المبيعات والمرتجعات.' },
    list: {
      fr: ['Import catalogue Excel', 'Photos produits HD', 'Statistiques quotidiennes', 'Gestion retours & remises'],
      en: ['Excel catalog import', 'HD product photos', 'Daily statistics', 'Returns & discounts management'],
      ar: ['استيراد من Excel', 'صور منتجات عالية الجودة', 'إحصائيات يومية', 'إدارة المرتجعات'],
    },
  },
  {
    icon: '🛠️',
    title: { fr: 'Ateliers & Fabrication', en: 'Workshops & Manufacturing', ar: 'الورشات والتصنيع' },
    desc: { fr: 'Suivi des matières premières, fiches techniques et calcul des coûts de revient.', en: 'Raw materials tracking, recipe sheets and cost price calculations.', ar: 'تتبع المواد الأولية، البطاقات التقنية وحساب تكلفة الإنتاج.' },
    list: {
      fr: ['Gestion des matières premières', 'Fiches techniques de fabrication', 'Calcul du coût de revient', 'Suivi ordres de production'],
      en: ['Raw materials management', 'Manufacturing recipe sheets', 'Cost price calculation', 'Production orders tracking'],
      ar: ['إدارة المواد الأولية', 'البطاقات التقنية للتصنيع', 'حساب تكلفة الإنتاج', 'متابعة أوامر الإنتاج'],
    },
  },
  {
    icon: '💊',
    title: { fr: 'Pharmacies & Librairies', en: 'Pharmacies & Bookstores', ar: 'صيدليات ومكتبات' },
    desc: { fr: 'Recherche rapide parmi des milliers de références.', en: 'Quick search among thousands of references.', ar: 'بحث سريع بين آلاف المراجع.' },
    list: {
      fr: ['Recherche instantanée', 'Alertes rupture', 'NIF/NIS fournisseurs', 'Historique achats'],
      en: ['Instant search', 'Out-of-stock alerts', 'Supplier NIF/NIS', 'Purchase history'],
      ar: ['بحث فوري', 'تنبيهات نفاد المخزون', 'NIF/NIS الموردين', 'سجل المشتريات'],
    },
  },
];

/* ═══════════════ PRICING DATA ═══════════════ */
const P1_FEATS: Record<string, string[]> = {
  fr: ['1 magasin', 'Caisse POS illimitée', 'Produits & Stock', 'Clients & Fournisseurs', 'Rapports de base', 'Support WhatsApp'],
  en: ['1 store', 'Unlimited POS', 'Products & Stock', 'Clients & Suppliers', 'Basic reports', 'WhatsApp support'],
  ar: ['محل واحد', 'كاشير غير محدود', 'منتجات ومخزون', 'عملاء وموردون', 'تقارير أساسية', 'دعم واتساب'],
};
const P2_FEATS: Record<string, string[]> = {
  fr: ['Multi-magasins', 'Toutes les fonctionnalités', 'Import Excel', 'Permissions vendeurs', 'Analytics avancés', 'IA intégrée', 'Support prioritaire'],
  en: ['Multi-store', 'All features', 'Excel import', 'Role permissions', 'Advanced analytics', 'Built-in AI', 'Priority support'],
  ar: ['محلات متعددة', 'كل المميزات', 'استيراد Excel', 'صلاحيات الموظفين', 'تحليلات متقدمة', 'ذكاء اصطناعي', 'دعم أولوي'],
};

const F_OPTS = ['f_opts_0', 'f_opts_1', 'f_opts_2', 'f_opts_3', 'f_opts_4', 'f_opts_5', 'f_opts_6', 'f_opts_7', 'f_opts_8'];

/* ═══════════════ TESTIMONIALS DATA ═══════════════ */
interface Testimonial {
  avatar: string;
  nameKey: string;
  roleKey: string;
  quoteKey: string;
  color: string;
}

const TESTIMONIALS: Testimonial[] = [
  { avatar: 'A', nameKey: 'testi_name', roleKey: 'testi_role', quoteKey: 'testi_quote', color: '#22c55e' },
  { avatar: 'S', nameKey: 'testi2_name', roleKey: 'testi2_role', quoteKey: 'testi2_quote', color: '#a855f7' },
  { avatar: 'Y', nameKey: 'testi3_name', roleKey: 'testi3_role', quoteKey: 'testi3_quote', color: '#3b82f6' },
];

/* ═══════════════ COMPONENT ═══════════════ */
export default function LandingClient({ locale, pageType = 'home' }: { locale: string, pageType?: 'home' | 'features' | 'apps' | 'usecases' | 'pricing' | 'contact' }) {
  const [lang, setLang] = useState(locale === 'ar' || locale === 'en' ? locale : 'fr');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [showFeatureDropdown, setShowFeatureDropdown] = useState(false);

  // Form state
  const [fn, setFn] = useState('');
  const [fp, setFp] = useState('');
  const [ft, setFt] = useState('');
  const [fm, setFm] = useState('');

  // Features Explorer State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const t = useCallback((key: string) => T[lang]?.[key] || T['fr']?.[key] || '', [lang]);

  // Filter features based on search query and selected category
  const filteredFeatures = FEATURES.map(cat => {
    // If a category is selected and doesn't match this category's French title, exclude it
    if (activeCategory !== 'all' && cat.title.fr !== activeCategory) {
      return null;
    }
    
    const items = cat.items[lang] || cat.items.fr;
    
    // If no search query, return all items for this category
    if (!searchQuery.trim()) {
      return { ...cat, filteredItems: items };
    }
    
    const query = searchQuery.toLowerCase().trim();
    const matchedItems = items.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.desc.toLowerCase().includes(query)
    );
    
    if (matchedItems.length === 0) {
      return null;
    }
    
    return { ...cat, filteredItems: matchedItems };
  }).filter(Boolean) as (FeatureCategory & { filteredItems: FeatureItem[] })[];

  // Total count of matching features
  const totalMatchesCount = filteredFeatures.reduce((acc, cat) => acc + cat.filteredItems.length, 0);
  const goTrial = () => { window.location.href = `/${lang}/register`; };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for reveal animations
  useEffect(() => {
    let observer: IntersectionObserver;
    // Use rAF to ensure DOM is settled after potential hydration recovery
    const rafId = requestAnimationFrame(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('visible');
              observer.unobserve(e.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
      );
      document.querySelectorAll('.lp-reveal, .lp-slide-up').forEach((el) => observer.observe(el));
    });
    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [lang, pageType]);

  // Update dir for language
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Testimonials auto-rotate
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendWA = () => {
    let msg = 'Bonjour SyncloudPOS!';
    if (fn) msg += '\nNom: ' + fn;
    if (fp) msg += '\nTél: ' + fp;
    if (ft) msg += '\nCommerce: ' + ft;
    if (fm) msg += '\n' + fm;
    else msg += "\nJe voudrais plus d'informations.";
    window.open(WA_BASE + '?text=' + encodeURIComponent(msg), '_blank');
  };

  return (
    <div className="landing-page" suppressHydrationWarning>
      {/* ═══ NAVBAR ═══ */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`} id="landing-nav">
        <div className="lp-nav-inner">
          <a href={`/${lang}`} className="lp-logo">
            <div className="lp-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 3h18v18H3z" stroke="currentColor" strokeWidth="2" rx="2" />
                <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <span className="lp-logo-text">Syncl<span>oud</span>POS</span>
          </a>
          <div className="lp-nav-links">
            <div className="lp-nav-dropdown-wrap"
                 onMouseEnter={() => setShowFeatureDropdown(true)}
                 onMouseLeave={() => setShowFeatureDropdown(false)}>
              <a href={`/${lang}/features`} className={`lp-nav-link ${pageType === 'features' ? 'active' : ''}`}>
                {t('nav_features')} <span className="lp-nav-caret">▾</span>
              </a>
              {showFeatureDropdown && (
                <div className="lp-mega-menu">
                  <div className="lp-mega-grid">
                    {FEATURES.map((cat, i) => (
                      <a key={i} href={`/${lang}/features`} className="lp-mega-item" onClick={() => setShowFeatureDropdown(false)}>
                        <span className="lp-mega-icon" style={{ background: cat.gradient }}>{cat.icon}</span>
                        <div>
                          <div className="lp-mega-title">{cat.title[lang] || cat.title.fr}</div>
                          <div className="lp-mega-desc">{cat.desc[lang] || cat.desc.fr}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                  <div className="lp-mega-footer">
                    <a href={`/${lang}/features`} className="lp-mega-all">{t('features_link')}</a>
                  </div>
                </div>
              )}
            </div>
            <a href={`/${lang}/apps`} className={`lp-nav-link ${pageType === 'apps' ? 'active' : ''}`}>{t('nav_apps')}</a>
            <a href={`/${lang}/usecases`} className={`lp-nav-link ${pageType === 'usecases' ? 'active' : ''}`}>{t('nav_usecases')}</a>
            <a href={`/${lang}/pricing`} className={`lp-nav-link ${pageType === 'pricing' ? 'active' : ''}`}>{t('nav_pricing')}</a>
            <a href={`/${lang}/contact`} className={`lp-nav-link ${pageType === 'contact' ? 'active' : ''}`}>{t('nav_contact')}</a>
            <div className="lp-lang-switch">
              {['fr', 'en', 'ar'].map((l) => (
                <button key={l} className={`lp-lang-btn ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
                  {l === 'fr' ? 'FR' : l === 'en' ? 'EN' : 'عر'}
                </button>
              ))}
            </div>
            <a href={`/${lang}/login`} className="lp-nav-link lp-login-btn-nav" style={{ marginRight: '8px', opacity: 0.85 }}>{t('nav_login')}</a>
            <button className="lp-nav-cta" onClick={() => window.location.href = `/${lang}/register`}>{t('nav_register')}</button>
          </div>
          <button className={`lp-hamburger ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`lp-mob-menu ${menuOpen ? 'open' : ''}`}>
        <a href={`/${lang}/features`} onClick={() => setMenuOpen(false)}>{t('nav_features')}</a>
        <a href={`/${lang}/apps`} onClick={() => setMenuOpen(false)}>{t('nav_apps')}</a>
        <a href={`/${lang}/usecases`} onClick={() => setMenuOpen(false)}>{t('nav_usecases')}</a>
        <a href={`/${lang}/pricing`} onClick={() => setMenuOpen(false)}>{t('nav_pricing')}</a>
        <a href={`/${lang}/contact`} onClick={() => setMenuOpen(false)}>{t('nav_contact')}</a>
        <a href={`/${lang}/login`} onClick={() => setMenuOpen(false)} style={{ color: '#4ade80', fontWeight: 'bold' }}>{t('nav_login')}</a>
        <div className="lp-lang-switch" style={{ margin: '8px 0' }}>
          {['fr', 'en', 'ar'].map((l) => (
            <button key={l} className={`lp-lang-btn ${lang === l ? 'active' : ''}`} onClick={() => { setLang(l); setMenuOpen(false); }}>
              {l === 'fr' ? 'FR' : l === 'en' ? 'EN' : 'عر'}
            </button>
          ))}
        </div>
        <button className="lp-btn-primary" onClick={() => { window.location.href = `/${lang}/register`; setMenuOpen(false); }}>{t('nav_register')}</button>
      </div>

      {pageType !== 'home' && (
        <section className="lp-hero" style={{ padding: '140px 0 60px 0', minHeight: 'auto', background: 'radial-gradient(circle at top, rgba(124, 58, 237, 0.08), transparent 60%)' }}>
          <div className="lp-container">
            <div className="lp-hero-inner" style={{ textAlign: 'center' }}>
              <h1 className="lp-hero-title" style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(135deg, #fff 30%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {pageType === 'features' && t('nav_features')}
                {pageType === 'apps' && t('sec_apps_tag')}
                {pageType === 'usecases' && t('nav_usecases')}
                {pageType === 'pricing' && t('sec_price_title')}
                {pageType === 'contact' && t('nav_contact')}
              </h1>
              <p className="lp-hero-desc" style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem', color: '#94a3b8' }}>
                {pageType === 'features' && t('sec_feat_desc')}
                {pageType === 'apps' && t('sec_apps_desc')}
                {pageType === 'usecases' && t('sec_uc_desc')}
                {pageType === 'pricing' && t('sec_price_desc')}
                {pageType === 'contact' && t('sec_cont_desc')}
              </p>
            </div>
          </div>
        </section>
      )}

      {pageType === 'home' && (
        <>
          {/* ═══ HERO ═══ */}
          <section className="lp-hero">
        <div className="lp-hero-bg">
          <div className="lp-hero-orb lp-orb1" />
          <div className="lp-hero-orb lp-orb2" />
          <div className="lp-hero-orb lp-orb3" />
          <div className="lp-hero-grid" />
        </div>
        <div className="lp-container">
          <div className="lp-hero-inner">
            <div className="lp-hero-content">
              <div className="lp-hero-badge lp-slide-up">
                <span className="lp-badge-dot" />
                <span>{t('hero_badge')}</span>
              </div>
              <h1 className="lp-hero-title lp-slide-up">
                {t('hero_h1a')}<br />
                <span className="lp-gradient-text">{t('hero_h1b')}</span>
              </h1>
              <p className="lp-hero-desc lp-slide-up">{t('hero_desc')}</p>
              <div className="lp-hero-actions lp-slide-up">
                <button className="lp-btn-primary" onClick={goTrial}>{t('hero_cta1')}</button>
                <a href={`/${lang}/features`} className="lp-btn-ghost">{t('hero_cta2')}</a>
              </div>
              <div className="lp-hero-stats lp-slide-up" id="hero-stats">
                <div className="lp-hstat"><div className="lp-hstat-num">120+</div><div className="lp-hstat-lbl">{t('stat1')}</div></div>
                <div className="lp-hstat-sep" />
                <div className="lp-hstat"><div className="lp-hstat-num">100%</div><div className="lp-hstat-lbl">{t('stat2')}</div></div>
                <div className="lp-hstat-sep" />
                <div className="lp-hstat"><div className="lp-hstat-num">3</div><div className="lp-hstat-lbl">{t('stat3')}</div></div>
                <div className="lp-hstat-sep" />
                <div className="lp-hstat"><div className="lp-hstat-num">7j</div><div className="lp-hstat-lbl">{t('stat4')}</div></div>
              </div>
            </div>
            <div className="lp-hero-visual" style={{ position: 'relative' }}>
              <div className="lp-dashboard-mock">
                <div className="lp-mock-topbar">
                  <div className="lp-mock-dots">
                    <span style={{ background: '#FF6B6B' }} />
                    <span style={{ background: '#FFD93D' }} />
                    <span style={{ background: '#6BCB77' }} />
                  </div>
                  <span className="lp-mock-url">SyncloudPOS – Dashboard</span>
                </div>
                <div className="lp-mock-body">
                  <div className="lp-mock-sidebar">
                    <div className="lp-ms-item active">🛒 <span>POS</span></div>
                    <div className="lp-ms-item">📦 <span>Stock</span></div>
                    <div className="lp-ms-item">👥 <span>Clients</span></div>
                    <div className="lp-ms-item">📊 <span>Stats</span></div>
                    <div className="lp-ms-item">💰 <span>Trésor</span></div>
                  </div>
                  <div className="lp-mock-main">
                    <div className="lp-mk-cards">
                      <div className="lp-mk-card lp-mk-green">
                        <div className="lp-mk-clbl">{lang === 'ar' ? 'رقم الأعمال' : lang === 'en' ? 'Revenue' : "Chiffre d'affaires"}</div>
                        <div className="lp-mk-cval">850 200 DA</div>
                        <div className="lp-mk-ctag">↑ +12%</div>
                      </div>
                      <div className="lp-mk-card lp-mk-purple">
                        <div className="lp-mk-clbl">{lang === 'ar' ? 'الربح الصافي' : lang === 'en' ? 'Net Profit' : 'Bénéfice Net'}</div>
                        <div className="lp-mk-cval">312 500 DA</div>
                        <div className="lp-mk-ctag">↑ +8%</div>
                      </div>
                      <div className="lp-mk-card lp-mk-blue">
                        <div className="lp-mk-clbl">{lang === 'ar' ? 'مبيعات/يوم' : lang === 'en' ? 'Sales/Day' : 'Ventes/Jour'}</div>
                        <div className="lp-mk-cval">43</div>
                        <div className="lp-mk-ctag">↑ +5</div>
                      </div>
                      <div className="lp-mk-card lp-mk-orange">
                        <div className="lp-mk-clbl">{lang === 'ar' ? 'مخزون منخفض' : lang === 'en' ? 'Low Stock' : 'Stock Faible'}</div>
                        <div className="lp-mk-cval">{lang === 'ar' ? '7 منتجات' : lang === 'en' ? '7 items' : '7 articles'}</div>
                        <div className="lp-mk-ctag">⚠️ {lang === 'ar' ? 'تنبيه' : lang === 'en' ? 'Alert' : 'Alerte'}</div>
                      </div>
                    </div>
                    <div className="lp-mk-chart">
                      <div className="lp-mk-chart-title">{lang === 'ar' ? 'المبيعات — 7 أيام' : lang === 'en' ? 'Sales — 7 days' : 'Ventes — 7 derniers jours'}</div>
                      <div className="lp-mk-bars">
                        {[42, 61, 48, 82, 56, 73, 95].map((h, i) => (
                          <div key={i} className={`lp-mk-bar ${h > 75 ? 'lp-mk-bar-hi' : ''}`} style={{ '--h': h } as React.CSSProperties}>
                            <span>{['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lp-float-badge lp-fb1">✅ {t('fb1')}</div>
              <div className="lp-float-badge lp-fb2">📦 {t('fb2')}</div>
              <div className="lp-float-badge lp-fb3">🤖 {t('fb3')}</div>
            </div>
          </div>
        </div>
        <div className="lp-scroll-hint">
          <div className="lp-scroll-arrow" />
        </div>
      </section>

      {/* ═══ TRUST BAR ═══ */}
      <div className="lp-trust-bar">
        <div className="lp-container">
          <p className="lp-trust-label">{t('trust_label')}</p>
          <div className="lp-trust-items">
            {['t1', 't2', 't3', 't4', 't5', 't6', 't7'].map((k, i) => (
              <span key={k} style={{ display: 'contents' }}>
                {i > 0 && <span className="lp-trust-sep">·</span>}
                <span className="lp-trust-item">
                  {['🛒', '🏭', '👕', '🛠️', '💊', '🔧', '🍕'][i]} {t(k)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
        </>
      )}

      {/* ═══ FEATURES ═══ */}
      {(pageType === 'home' || pageType === 'features') && (
        <section id="features" className={`lp-section ${pageType === 'features' ? 'lp-features-explorer' : ''}`}>
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-pill lp-pill-purple">{t('sec_feat_tag')}</div>
            <h2 className="lp-s-title">{t('sec_feat_title')}</h2>
            <p className="lp-s-desc">{t('sec_feat_desc')}</p>
          </div>

          {pageType === 'features' && (
            <>
            {/* Search Bar */}
            <div className="lp-search-container" style={{ marginTop: '32px' }}>
              <div className="lp-search-input-wrap">
                <span className="lp-search-icon">🔍</span>
                <input
                  type="text"
                  className="lp-search-input"
                  placeholder={
                    lang === 'ar'
                      ? "ابحث عن ميزة (مثال: يالدين، المخزون، فاتورة، كريدي)..."
                      : lang === 'en'
                      ? "Search for a feature (e.g. Yalidine, Stock, Invoice, Credit)..."
                      : "Rechercher une fonctionnalité (ex: Yalidine, Stock, Facture, Crédit)..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="lp-search-clear"
                    onClick={() => setSearchQuery('')}
                    title={lang === 'ar' ? 'مسح' : lang === 'en' ? 'Clear' : 'Effacer'}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills */}
            <div className="lp-categories-scroll" style={{ marginTop: '20px' }}>
              <div className="lp-categories-chips">
                <button
                  className={`lp-chip ${activeCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('all')}
                >
                  🌐 {lang === 'ar' ? 'الكل' : lang === 'en' ? 'All' : 'Tous'}
                </button>
                {FEATURES.map((cat, index) => {
                  const isActive = activeCategory === cat.title.fr;
                  return (
                    <button
                      key={index}
                      className={`lp-chip ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat.title.fr)}
                      style={isActive ? { background: cat.gradient, borderColor: 'transparent' } : {}}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.title[lang] || cat.title.fr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total count indicator */}
            {searchQuery.trim() !== '' && (
              <div className="lp-results-info" style={{ marginTop: '16px' }}>
                <div className="lp-results-count">
                  {lang === 'ar' ? 'نتائج البحث عن' : lang === 'en' ? 'Search results for' : 'Résultats de recherche pour'} : <strong style={{ color: 'var(--lp-primary-light)' }}>"{searchQuery}"</strong>
                </div>
                <div className="lp-results-pill">
                  {totalMatchesCount} {lang === 'ar' ? 'ميزة' : lang === 'en' ? 'features' : 'fonctionnalités'}
                </div>
              </div>
            )}
            </>
          )}

          {/* Features Listing */}
          {pageType === 'features' ? (
            <div className="lp-features-list" style={{ marginTop: '32px' }}>
            {filteredFeatures.length > 0 ? (
              filteredFeatures.map((cat, ci) => (
                <div key={ci} className="lp-feat-category lp-reveal" style={{ animation: 'lp-fade-in 0.4s ease' }}>
                  <div className="lp-feat-cat-header">
                    <div className="lp-feat-cat-icon" style={{ background: cat.gradient }}>{cat.icon}</div>
                    <div>
                      <h3 className="lp-feat-cat-title">{cat.title[lang] || cat.title.fr}</h3>
                      <p className="lp-feat-cat-desc">{cat.desc[lang] || cat.desc.fr}</p>
                    </div>
                  </div>
                  <div className="lp-feat-grid">
                    {cat.filteredItems.map((item, fi) => (
                      <div key={fi} className="lp-feat-item">
                        <div className="lp-fi-icon">{item.icon}</div>
                        <div>
                          <div className="lp-fi-title">{item.title}</div>
                          <div className="lp-fi-desc">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              /* No Results State */
              <div className="lp-no-results">
                <span className="lp-no-results-icon">🔍</span>
                <h4>{lang === 'ar' ? 'لم يتم العثور على ميزات' : lang === 'en' ? 'No features found' : 'Aucun résultat'}</h4>
                <p>
                  {lang === 'ar'
                    ? 'لم نجد أي ميزة تطابق الكلمة المفتاحية المكتوبة. يرجى تجربة كلمة أخرى.'
                    : lang === 'en'
                    ? "We couldn't find any feature matching your search term. Please try another keyword."
                    : 'Aucune fonctionnalité ne correspond à votre terme de recherche. Veuillez essayer un autre mot-clé.'}
                </p>
                <button
                  className="lp-no-results-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                >
                  {lang === 'ar' ? 'إعادة ضبط البحث' : lang === 'en' ? 'Reset search' : 'Réinitialiser la recherche'}
                </button>
              </div>
            )}
            </div>
          ) : (
            <div className="lp-features-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '40px' }}>
              {FEATURES.slice(0, 4).map((cat) => (
                <div key={cat.title.fr} className="lp-feature-sum-card" style={{ background: '#1e293b', padding: '32px', borderRadius: '24px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{cat.icon}</div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>
                    {lang === 'ar' ? cat.title.ar : lang === 'en' ? cat.title.en : cat.title.fr}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '20px', lineHeight: 1.6 }}>
                    {lang === 'ar' ? cat.desc.ar : lang === 'en' ? cat.desc.en : cat.desc.fr}
                  </p>
                  <ul style={{ color: '#f8fafc', paddingLeft: '16px', listStyleType: 'disc', fontSize: '0.9rem' }}>
                    {(cat.items[lang] || cat.items.fr).slice(0, 4).map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '8px' }}>
                        <strong>{item.title}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '32px' }}>
                <button className="lp-btn-primary" onClick={() => window.location.href = `/${lang}/features`} style={{ padding: '16px 36px', fontSize: '1.1rem' }}>
                  {lang === 'ar' ? 'اكتشف كل المميزات الـ 120+ ←' : lang === 'en' ? 'Explore all 120+ Features ←' : 'Découvrir toutes les 120+ fonctionnalités ←'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* ═══ USE CASES ═══ */}
      {pageType === 'usecases' && (
        <section id="usecases" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-pill lp-pill-teal">{t('sec_uc_tag')}</div>
            <h2 className="lp-s-title">{t('sec_uc_title')}</h2>
            <p className="lp-s-desc">{t('sec_uc_desc')}</p>
          </div>
          <div className="lp-uc-grid">
            {USE_CASES.map((uc, i) => (
              <div key={i} className="lp-uc-card lp-reveal">
                <div className="lp-uc-icon">{uc.icon}</div>
                <h3 className="lp-uc-title">{uc.title[lang] || uc.title.fr}</h3>
                <p className="lp-uc-desc">{uc.desc[lang] || uc.desc.fr}</p>
                <ul className="lp-uc-list">
                  {(uc.list[lang] || uc.list.fr).map((item, li) => (
                    <li key={li}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ═══ MOBILE APPS ═══ */}
      {pageType === 'apps' && (
        <section id="apps" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-pill lp-pill-purple">{t('sec_apps_tag')}</div>
            <h2 className="lp-s-title">{t('sec_apps_title')}</h2>
            <p className="lp-s-desc">{t('sec_apps_desc')}</p>
          </div>
          <div className="lp-apps-grid">
            {/* SynCloud Gérant */}
            <div className="lp-app-card lp-reveal">
              <div className="lp-app-card-header">
                <div className="lp-app-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="white" strokeWidth="2" />
                    <path d="M7 13l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="lp-app-name">{t('app1_name')}</h3>
                  <span className="lp-app-badge-os">📱 Android & iOS</span>
                </div>
              </div>
              <p className="lp-app-desc">{t('app1_desc')}</p>
              <ul className="lp-app-features">
                {['app1_f1', 'app1_f2', 'app1_f3', 'app1_f4', 'app1_f5', 'app1_f6', 'app1_f7', 'app1_f8'].map((k) => (
                  <li key={k}><span className="lp-app-check">✓</span>{t(k)}</li>
                ))}
              </ul>
              
              {/* Premium Direct Download Section */}
              <div className="lp-app-download-zone">
                <div className="lp-download-lbl">
                  {lang === 'ar'
                    ? 'رابط التحميل المباشر للـ APK (بدون إكسبو) :'
                    : lang === 'en'
                    ? 'Direct APK Download Link (No Expo):'
                    : 'Lien de téléchargement direct APK (Sans Expo) :'}
                </div>
                <a
                  href="https://chirpedbeo.online/downloads/syncloudpos-gerant-v2.3.0.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-download-link"
                >
                  chirpedbeo.online/downloads/syncloudpos-gerant-v2.3.0.apk
                </a>
                
                <a
                  href="https://chirpedbeo.online/downloads/syncloudpos-gerant-v2.3.0.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-download-btn"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                >
                  📥 {lang === 'ar' ? 'تحميل APK المباشر (تحديث v2.3.0)' : lang === 'en' ? 'Download Direct APK (v2.3.0)' : "Télécharger l'APK Direct (Mise à jour v2.3.0)"}
                </a>

                <div className="lp-qr-container">
                  <div className="lp-qr-box">
                    <QRCodeSVG
                      value="https://chirpedbeo.online/downloads/syncloudpos-gerant-v2.3.0.apk"
                      size={80}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="lp-qr-lbl">
                    {lang === 'ar'
                      ? 'أو امسح الـ QR بهاتفك للتحميل الفوري بدون كابل'
                      : lang === 'en'
                      ? 'Or scan QR with your phone to download instantly'
                      : 'Ou scannez le QR avec votre mobile pour installer direct'}
                  </div>
                </div>
              </div>

              <div className="lp-app-mockup">
                <div className="lp-phone-frame">
                  <div className="lp-phone-notch" />
                  <div className="lp-phone-screen" style={{ background: 'linear-gradient(180deg, #0f172a, #1e293b)' }}>
                    <div className="lp-pm-bar" style={{ background: '#22c55e' }}>
                      <span>📊</span> <span style={{ fontWeight: 700 }}>{t('app1_name')}</span>
                    </div>
                    <div className="lp-pm-cards">
                      <div className="lp-pm-card" style={{ borderLeft: '3px solid #22c55e' }}>
                        <div style={{ fontSize: '10px', opacity: 0.6 }}>{lang === 'ar' ? 'رقم الأعمال' : lang === 'en' ? 'Revenue' : 'CA'}</div>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>850K DA</div>
                      </div>
                      <div className="lp-pm-card" style={{ borderLeft: '3px solid #a855f7' }}>
                        <div style={{ fontSize: '10px', opacity: 0.6 }}>{lang === 'ar' ? 'الربح' : lang === 'en' ? 'Profit' : 'Bénéfice'}</div>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>312K DA</div>
                      </div>
                    </div>
                    <div className="lp-pm-cards">
                      <div className="lp-pm-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                        <div style={{ fontSize: '10px', opacity: 0.6 }}>{lang === 'ar' ? 'ديون' : lang === 'en' ? 'Debts' : 'Créances'}</div>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>145K DA</div>
                      </div>
                      <div className="lp-pm-card" style={{ borderLeft: '3px solid #3b82f6' }}>
                        <div style={{ fontSize: '10px', opacity: 0.6 }}>{lang === 'ar' ? 'سائقون' : lang === 'en' ? 'Drivers' : 'Livreurs'}</div>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>4 🟢</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SynCloud Tournée */}
            <div className="lp-app-card lp-reveal">
              <div className="lp-app-card-header">
                <div className="lp-app-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12l4-4v3h10V8l4 4-4 4v-3H5v3l-4-4z" stroke="white" strokeWidth="1.5" fill="none" />
                    <circle cx="18" cy="17" r="3" stroke="white" strokeWidth="1.5" />
                    <circle cx="6" cy="17" r="3" stroke="white" strokeWidth="1.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="lp-app-name">{t('app2_name')}</h3>
                  <span className="lp-app-badge-os">📱 Android & iOS</span>
                </div>
              </div>
              <p className="lp-app-desc">{t('app2_desc')}</p>
              <ul className="lp-app-features">
                {['app2_f1', 'app2_f2', 'app2_f3', 'app2_f4', 'app2_f5', 'app2_f6', 'app2_f7', 'app2_f8'].map((k) => (
                  <li key={k}><span className="lp-app-check">✓</span>{t(k)}</li>
                ))}
              </ul>
              
              {/* Premium Direct Download Section */}
              <div className="lp-app-download-zone">
                <div className="lp-download-lbl">
                  {lang === 'ar'
                    ? 'رابط التحميل المباشر للـ APK (بدون إكسبو) :'
                    : lang === 'en'
                    ? 'Direct APK Download Link (No Expo):'
                    : 'Lien de téléchargement direct APK (Sans Expo) :'}
                </div>
                <a
                  href="https://expo.dev/accounts/aitee/projects/syncloud-tournee/builds/c5445edf-4ed3-4c52-9b73-134714a681bb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-download-link"
                >
                  expo.dev/aitee/syncloud-tournee/builds/c5445edf
                </a>
                
                <a
                  href="https://expo.dev/accounts/aitee/projects/syncloud-tournee/builds/c5445edf-4ed3-4c52-9b73-134714a681bb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-download-btn"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                >
                  📥 {lang === 'ar' ? 'تحميل APK المباشر' : lang === 'en' ? 'Download Direct APK' : "Télécharger l'APK Direct"}
                </a>

                <div className="lp-qr-container">
                  <div className="lp-qr-box">
                    <QRCodeSVG
                      value="https://expo.dev/accounts/aitee/projects/syncloud-tournee/builds/c5445edf-4ed3-4c52-9b73-134714a681bb"
                      size={80}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="lp-qr-lbl">
                    {lang === 'ar'
                      ? 'أو امسح الـ QR بهاتفك للتحميل الفوري بدون كابل'
                      : lang === 'en'
                      ? 'Or scan QR with your phone to download instantly'
                      : 'Ou scannez le QR avec votre mobile pour installer direct'}
                  </div>
                </div>
              </div>

              <div className="lp-app-mockup">
                <div className="lp-phone-frame">
                  <div className="lp-phone-notch" />
                  <div className="lp-phone-screen" style={{ background: 'linear-gradient(180deg, #0f172a, #1e293b)' }}>
                    <div className="lp-pm-bar" style={{ background: '#3b82f6' }}>
                      <span>🚛</span> <span style={{ fontWeight: 700 }}>{t('app2_name')}</span>
                    </div>
                    <div className="lp-pm-route">
                      <div className="lp-pm-route-item lp-pm-done">✅ {lang === 'ar' ? 'أحمد — تم' : lang === 'en' ? 'Ahmed — Done' : 'Ahmed — Livré'}</div>
                      <div className="lp-pm-route-item lp-pm-active">📍 {lang === 'ar' ? 'كريم — جاري' : lang === 'en' ? 'Karim — Active' : 'Karim — En cours'}</div>
                      <div className="lp-pm-route-item">⏳ {lang === 'ar' ? 'سمير — في الانتظار' : lang === 'en' ? 'Samir — Pending' : 'Samir — En attente'}</div>
                      <div className="lp-pm-route-item">⏳ {lang === 'ar' ? 'يوسف — في الانتظار' : lang === 'en' ? 'Youssef — Pending' : 'Youssef — En attente'}</div>
                    </div>
                    <div className="lp-pm-bottom-bar">
                      <span>🗺️</span><span>👥</span><span>📊</span><span>⚙️</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ═══ HOW IT WORKS ═══ */}
      {pageType === 'home' && (
        <section className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-pill lp-pill-yellow">{t('sec_how_tag')}</div>
            <h2 className="lp-s-title">{t('sec_how_title')}</h2>
            <p className="lp-s-desc">{t('sec_how_desc')}</p>
          </div>
          <div className="lp-steps-grid">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} style={{ display: 'contents' }}>
                {n > 1 && <div className="lp-step-connector lp-reveal" />}
                <div className="lp-step-card lp-reveal">
                  <div className="lp-step-num">0{n}</div>
                  <div className="lp-step-icon">{['📝', '📥', '🛒', '📈'][n - 1]}</div>
                  <h3>{t(`st${n}`)}</h3>
                  <p>{t(`st${n}d`)}</p>
                </div>
              </span>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ═══ TESTIMONIALS CAROUSEL ═══ */}
      {(pageType === 'home' || pageType === 'usecases') && (
        <section className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-pill lp-pill-purple">{t('sec_testi_tag')}</div>
            <h2 className="lp-s-title">{t('sec_testi_title')}</h2>
          </div>
          <div className="lp-testi-carousel lp-reveal">
            <div className="lp-testi-track" style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}>
              {TESTIMONIALS.map((testi, idx) => (
                <div key={idx} className="lp-testi-slide">
                  <div className="lp-testi-card">
                    <div className="lp-testi-stars">★★★★★</div>
                    <blockquote className="lp-testi-quote">{t(testi.quoteKey)}</blockquote>
                    <div className="lp-testi-author">
                      <div className="lp-testi-avatar" style={{ background: testi.color }}>{testi.avatar}</div>
                      <div>
                        <div className="lp-testi-name">{t(testi.nameKey)}</div>
                        <div className="lp-testi-role">{t(testi.roleKey)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lp-testi-dots">
              {TESTIMONIALS.map((_, idx) => (
                <button
                  key={idx}
                  className={`lp-testi-dot ${activeTestimonial === idx ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(idx)}
                  aria-label={`Testimonial ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ═══ PRICING ═══ */}
      {(pageType === 'home' || pageType === 'pricing') && (
        <section id="pricing" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-pill lp-pill-teal">{t('sec_price_tag')}</div>
            <h2 className="lp-s-title">{t('sec_price_title')}</h2>
            <p className="lp-s-desc">{t('sec_price_desc')}</p>
          </div>
          <div className="lp-price-grid">
            {/* Starter */}
            <div className="lp-price-card lp-reveal">
              <div className="lp-price-icon">🚀</div>
              <div className="lp-price-name">{t('p1_name')}</div>
              <div className="lp-price-amount">{t('p1_price')}</div>
              <div className="lp-price-sub">{t('p1_sub')}</div>
              <ul className="lp-price-list">
                {(P1_FEATS[lang] || P1_FEATS.fr).map((f, i) => (
                  <li key={i}><span className="lp-price-check">✓</span>{f}</li>
                ))}
              </ul>
              <a href={`${WA_BASE}?text=${encodeURIComponent('Bonjour, je cherche un devis pour SyncloudPOS Starter')}`} className="lp-btn-ghost lp-full-width" target="_blank" rel="noopener noreferrer">{t('p1_btn')}</a>
            </div>
            {/* Pro */}
            <div className="lp-price-card lp-price-featured lp-reveal">
              <div className="lp-price-badge">{t('recommended')}</div>
              <div className="lp-price-icon">💎</div>
              <div className="lp-price-name">{t('p2_name')}</div>
              <div className="lp-price-amount">{t('p2_price')}</div>
              <div className="lp-price-sub">{t('p2_sub')}</div>
              <ul className="lp-price-list">
                {(P2_FEATS[lang] || P2_FEATS.fr).map((f, i) => (
                  <li key={i}><span className="lp-price-check">✓</span>{f}</li>
                ))}
              </ul>
              <button className="lp-btn-primary lp-full-width" onClick={goTrial}>{t('p2_btn')}</button>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ═══ TRIAL CTA ═══ */}
      {(pageType === 'home' || pageType === 'pricing') && (
        <section className="lp-trial">
        <div className="lp-container">
          <div className="lp-trial-inner lp-reveal">
            <div className="lp-trial-orb lp-trial-orb1" />
            <div className="lp-trial-orb lp-trial-orb2" />
            <div className="lp-pill lp-pill-purple">{t('trial_pill')}</div>
            <h2 className="lp-trial-title">
              {t('trial_h2a')} <span className="lp-gradient-text">{t('trial_h2b')}</span>
            </h2>
            <p className="lp-trial-desc">{t('trial_desc')}</p>
            <div className="lp-trial-checks">
              {['trial_c1', 'trial_c2', 'trial_c3'].map((k) => (
                <span key={k} className="lp-trial-check">
                  <span className="lp-trial-check-icon">✓</span> {t(k)}
                </span>
              ))}
            </div>
            <div className="lp-trial-actions">
              <button className="lp-btn-primary" onClick={goTrial}>{t('trial_btn1')}</button>
              <a href={`${WA_BASE}?text=${encodeURIComponent("Bonjour, je veux plus d'informations sur SyncloudPOS")}`} className="lp-btn-wa" target="_blank" rel="noopener noreferrer">{t('trial_btn2')}</a>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ═══ CONTACT ═══ */}
      {pageType === 'contact' && (
        <section id="contact" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header lp-reveal">
            <div className="lp-pill lp-pill-purple">{t('sec_cont_tag')}</div>
            <h2 className="lp-s-title">{t('sec_cont_title')}</h2>
            <p className="lp-s-desc">{t('sec_cont_desc')}</p>
          </div>
          <div className="lp-contact-grid">
            <div className="lp-reveal">
              <div className="lp-ci-card">
                <div className="lp-ci-item">
                  <div className="lp-ci-icon" style={{ background: 'rgba(37,211,102,.12)', borderColor: 'rgba(37,211,102,.3)' }}>📲</div>
                  <div>
                    <div className="lp-ci-lbl">WhatsApp</div>
                    <div className="lp-ci-val">+213 696 92 82 27</div>
                  </div>
                </div>
                <div className="lp-ci-item">
                  <div className="lp-ci-icon" style={{ background: 'rgba(108,99,255,.12)', borderColor: 'rgba(108,99,255,.3)' }}>⏰</div>
                  <div>
                    <div className="lp-ci-lbl">{t('ci_avail')}</div>
                    <div className="lp-ci-val">7j/7 · 8h – 22h</div>
                  </div>
                </div>
                <div className="lp-ci-item">
                  <div className="lp-ci-icon" style={{ background: 'rgba(0,212,170,.12)', borderColor: 'rgba(0,212,170,.3)' }}>🇩🇿</div>
                  <div>
                    <div className="lp-ci-lbl">{t('ci_location')}</div>
                    <div className="lp-ci-val">{t('ci_location_val')}</div>
                  </div>
                </div>
              </div>
              <div className="lp-ci-actions">
                <button className="lp-btn-primary" onClick={goTrial}>{t('ci_btn1')}</button>
                <a href={`${WA_BASE}?text=${encodeURIComponent('Bonjour, je veux acheter SyncloudPOS')}`} className="lp-btn-wa" target="_blank" rel="noopener noreferrer">{t('ci_btn2')}</a>
              </div>
            </div>
            <div className="lp-contact-form-wrap lp-reveal">
              <h3>{t('form_title')}</h3>
              <div className="lp-fg">
                <label>{t('f_name')}</label>
                <input type="text" placeholder={t('f_ph_name')} value={fn} onChange={(e) => setFn(e.target.value)} />
              </div>
              <div className="lp-fg">
                <label>{t('f_phone')}</label>
                <input type="tel" placeholder={t('f_ph_phone')} value={fp} onChange={(e) => setFp(e.target.value)} />
              </div>
              <div className="lp-fg">
                <label>{t('f_type')}</label>
                <select value={ft} onChange={(e) => setFt(e.target.value)}>
                  {F_OPTS.map((k) => (
                    <option key={k} value={t(k)}>{t(k)}</option>
                  ))}
                </select>
              </div>
              <div className="lp-fg">
                <label>{t('f_msg')}</label>
                <textarea rows={4} placeholder={t('f_ph_msg')} value={fm} onChange={(e) => setFm(e.target.value)} />
              </div>
              <button className="lp-btn-wa lp-full-width" onClick={sendWA}>{t('f_send')}</button>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div>
              <a href="#" className="lp-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <div className="lp-logo-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3h18v18H3z" stroke="currentColor" strokeWidth="2" rx="2" />
                    <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <span className="lp-logo-text">Syncl<span>oud</span>POS</span>
              </a>
              <p className="lp-footer-tagline">{t('footer_desc')}</p>
              <a href={WA_BASE} className="lp-btn-wa-sm" target="_blank" rel="noopener noreferrer">📲 +213 696 92 82 27</a>
            </div>
            <div className="lp-footer-col">
              <h4>{t('fl1')}</h4>
              <a href={`/${lang}/features`}>{lang === 'ar' ? 'الكاشير' : lang === 'en' ? 'POS' : 'Caisse POS'}</a>
              <a href={`/${lang}/features`}>{lang === 'ar' ? 'إدارة المخزون' : lang === 'en' ? 'Stock Management' : 'Gestion stock'}</a>
              <a href={`/${lang}/features`}>{lang === 'ar' ? 'عملاء وديون' : lang === 'en' ? 'Clients & Credits' : 'Clients & Crédits'}</a>
              <a href={`/${lang}/features`}>{lang === 'ar' ? 'استيراد Excel' : lang === 'en' ? 'Excel Import' : 'Import Excel'}</a>
              <a href={`/${lang}/features`}>{lang === 'ar' ? 'محلات متعددة' : lang === 'en' ? 'Multi-Store' : 'Multi-magasins'}</a>
            </div>
            <div className="lp-footer-col">
              <h4>{t('fl2')}</h4>
              <a href={`${WA_BASE}?text=${encodeURIComponent('Bonjour, support SyncloudPOS')}`} target="_blank" rel="noopener noreferrer">
                {lang === 'ar' ? 'دعم واتساب' : lang === 'en' ? 'WhatsApp Support' : 'WhatsApp Support'}
              </a>
              <a href={`/${lang}/contact`}>{lang === 'ar' ? 'اتصل بنا' : lang === 'en' ? 'Contact us' : 'Nous contacter'}</a>
              <a href={`/${lang}/register`}>{lang === 'ar' ? 'تجربة مجانية' : lang === 'en' ? 'Free Trial' : 'Essai gratuit'}</a>
            </div>
            <div className="lp-footer-col">
              <h4>{t('fl3')}</h4>
              <div className="lp-footer-langs">
                <button onClick={() => setLang('fr')}>🇫🇷 Français</button>
                <button onClick={() => setLang('en')}>🇬🇧 English</button>
                <button onClick={() => setLang('ar')}>🇩🇿 العربية</button>
              </div>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>{t('copyright')}</span>
            <span className="lp-footer-seo">
              {lang === 'ar' ? 'برنامج كاشير · POS الجزائر · إدارة تجارية' : lang === 'en' ? 'POS Software · POS Algeria · Business Management' : 'Logiciel de caisse · POS Algérie · Gestion commerciale'}
            </span>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float */}
      <a href={`${WA_BASE}?text=${encodeURIComponent("Bonjour, je veux plus d'infos sur SyncloudPOS")}`} className="lp-wa-float" target="_blank" rel="noopener noreferrer" title="WhatsApp">
        <svg viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.845L.057 23.996l6.304-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.012-1.374l-.36-.213-3.735.98.997-3.648-.234-.374A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
        </svg>
      </a>
    </div>
  );
}
