const APP_URL = '/fr/register'; // Redirect to register directly
const WA = 'https://wa.me/213696928227';

const T = {
    fr: {
        nav1: 'Fonctionnalités', nav2: "Cas d'usage", nav3: 'Success Story', nav4: 'Formation', nav5: 'Contact', nav_cta: 'Essai Gratuit',
        badge: 'Logiciel de Caisse Algérien',
        h1a: 'Gérez votre commerce avec', h1b: 'intelligence',
        hdesc: "SyncloudPOS est le logiciel tout-en-un pour les commerces algériens — superettes, boutiques, grossistes, pharmacies. Gérez vos ventes, stock, clients et finances depuis n'importe quel appareil.",
        btn_trial: '🚀 Essai Gratuit 7 Jours', btn_more: 'Voir les fonctionnalités ↓',
        btn_wa: '📲 Contacter sur WhatsApp', btn_wa2: '📲 Commander sur WhatsApp',
        s_feat: 'Fonctionnalités', s_uc: "Cas d'utilisation", s_suc: 'Success Story', s_how: 'Comment ça marche', s_trial: 'Offre Spéciale', s_tar: 'Tarifs', s_cont: 'Contact',

        feat_title: 'Tout ce dont vous avez besoin', feat_desc: 'Une solution complète conçue pour les commerces algériens — épiceries, boutiques, grossistes, pharmacies et plus.',
        f1: '🛒 Caisse Enregistreuse (POS)', f1d: 'Interface de vente rapide avec scan barcode, paiement partiel, sélection client, impression reçu thermique et raccourcis clavier.',
        f2: '📦 Gestion des Produits', f2d: 'Gérez produits avec photos 300x300, catégories, marques, prix vente/achat/gros, stock minimum et plusieurs codes-barres par article.',
        f3: '👥 Clients & Crédits', f3d: 'Fiches clients avec NIF/NIS/NRC/RIB banque, historique achats, solde impayé, crédits, et suivi complet des dettes.',
        f4: '🏭 Fournisseurs', f4d: 'Informations fiscales algériennes, commandes achat, paiements, avances, bon de livraison et historique complet.',
        f5: '💰 Trésorerie', f5d: 'Multi-caisses et comptes bancaires en temps réel. Transferts internes, historique des transactions et soldes.',
        f6: '📊 Dashboard & Analytics', f6d: 'CA, bénéfice net, COGS, évolution des ventes, top produits et rapports financiers complets.',
        f7: '🏪 Multi-Magasins', f7d: 'Gérez plusieurs points de vente depuis un compte. Passez dun magasin à lautre avec des stocks séparés.',
        f8: '📋 Avaries & Pertes', f8d: 'Enregistrez pertes, produits périmés ou avariés. Filtrage par date et produit. Stock mis à jour automatiquement.',
        f9: '📥 Import Excel', f9d: 'Importez produits, catégories, marques, clients et fournisseurs depuis Excel en secondes avec modèle téléchargeable.',
        f10: '🔒 Permissions Vendeurs', f10d: 'Comptes vendeurs avec permissions granulaires: autoriser/bloquer modification et suppression des données.',
        f11: '💸 Gestion des Dépenses', f11d: 'Catégorisez toutes dépenses (loyer, salaires, électricité...). Intégration directe avec votre trésorerie.',
        f12: '🌍 Multi-Langues', f12d: 'Interface disponible en Français, Arabe et Anglais. Changez la langue à tout moment sans perdre vos données.',

        uc_title: "À qui s'adresse SyncloudPOS ?", uc_desc: 'Une solution flexible pour divers secteurs en Algérie. Chaque type de commerce y trouve son compte.',
        uc1: '🛒 Superettes & Alimentation', uc1d: "Encaissement ultra-rapide avec scan barcode. Dates de péremption, avaries, et tickets instantanés.",
        uc1_l: ['Scan centaines d\'articles/heure', 'Gestion avaries & périmés', 'Tickets thermiques automatiques', 'Alertes stock minimum'],
        uc2: '🏭 Grossistes & Distributeurs', uc2d: 'Multi-tarifs (Prix Gros, Revendeur, Détail). Suivi crédits clients, paiements en tranches.',
        uc2_l: ['Prix de gros / détail / revendeur', 'Bons de livraison intégrés', 'Crédits & paiements partiels', 'Rapports par client'],
        uc3: '👕 Boutiques & Commerce', uc3d: 'Analyse meilleures ventes, retours clients, suivi CA quotidien et gestion stock.',
        uc3_l: ['Import catalogue Excel', 'Photos produits HD', 'Statistiques quotidiennes', 'Gestion retours & remises'],
        uc4: '💊 Pharmacies & Librairies', uc4d: 'Recherche rapide parmi des milliers de références. Stock minimum et intégration fournisseurs complète.',
        uc4_l: ['Recherche instantanée', 'Alertes rupture de stock', 'NIF/NIS fournisseurs', 'Historique des achats'],

        suc_title: 'Ils font confiance à SyncloudPOS',
        quote: "« Avant SyncloudPOS, je perdais des heures chaque soir à calculer ma caisse et je ne savais jamais exactement ce qu'il me restait en stock. Aujourd'hui je gère ma superette et mon magasin de gros depuis mon téléphone à la maison. Le suivi des crédits clients a sauvé ma trésorerie — j'ai récupéré plus de 400 000 DA de dettes que j'avais oubliées. »",
        qauth: 'Ahmed B.', qrole: 'Propriétaire – 2 Superettes + 1 Dépôt, Alger',

        how_title: 'Démarrez en 4 étapes simples', how_desc: 'Prêt à l\'emploi en quelques minutes, aucune installation complexe.',
        st1: 'Inscrivez-vous', st1d: 'Créez votre compte gratuitement. Configuration en 5 minutes.',
        st2: 'Ajoutez vos données', st2d: 'Importez produits, clients et fournisseurs depuis Excel.',
        st3: 'Commencez à vendre', st3d: 'Utilisez la caisse POS depuis ordinateur, tablette ou téléphone.',
        st4: 'Suivez vos résultats', st4d: 'Dashboard temps réel: CA, bénéfices, stock, clients impayés.',

        trial_title: '7 jours d\'essai', trial_span: '100% gratuits', trial_desc: 'Testez toutes les fonctionnalités sans engagement. Aucune carte bancaire requise.',
        trial_note: '✓ Sans engagement · ✓ Accès complet · ✓ Support inclus',

        tar_title: 'Plans adaptés à votre commerce', tar_desc: 'Toutes les formules incluent l\'accès complet. Contactez pour un devis.',
        p1: 'Starter', p1a: 'Sur mesure', p1_note: 'Devis sur WhatsApp',
        p1_feats: ['1 magasin', 'Caisse POS illimitée', 'Produits & Stock', 'Clients & Fournisseurs', 'Rapports de base', 'Support WhatsApp'],
        p2: 'Pro', p2a: 'Sur mesure', p2_note: 'Devis sur WhatsApp',
        p2_feats: ['Multi-magasins', 'Toutes les fonctionnalités', 'Import Excel', 'Permissions vendeurs', 'Analytics avancés', 'Support prioritaire'],
        p1_btn: 'Demander un devis', p2_btn: 'Démarrer l\'essai gratuit',

        cont_title: 'Parlons de votre commerce', cont_desc: 'Disponible 7j/7 sur WhatsApp. Accompagnement de l\'installation à la formation.',
        form_title: 'Message rapide', f_name: 'Votre nom', f_phone: 'Numéro WhatsApp', f_type: 'Type de commerce', f_msg: 'Votre message',
        f_ph_name: 'Ex: Ahmed Bensalem', f_ph_phone: '+213 6XX XX XX XX', f_ph_msg: 'Je voudrais tester SyncloudPOS...',
        f_opts: ['Sélectionnez...', 'Épicerie / Alimentation', 'Commerce de gros', 'Boutique vêtements', 'Pharmacie / Parapharmacie', 'Matériaux de construction', 'Électronique', 'Autre'],
        f_send: '📲 Envoyer via WhatsApp',

        tr_title: 'Centre de Formation', tr_desc: 'Apprenez à maîtriser SyncloudPOS en quelques minutes. Guides étape par étape.',
        tr1: '1. Configuration Initiale', tr1d: 'Ajoutez vos informations commerciales: NIF, NIS, NRC, RIB. Configurez votre reçu thermique avec logo, adresse et pied de page personnalisé.',
        tr2: '2. Ajout de Produits', tr2d: 'Créez articles avec code-barres (scan ou manuel), photo 300x300, prix vente/achat/gros, catégorie, marque, et stock minimum pour alertes.',
        tr3: '3. Import Excel', tr3d: "Téléchargez le modèle depuis l'application, remplissez-le avec vos produits/clients/fournisseurs et glissez-le dans la fenêtre d'import.",
        tr4: '4. Vente au Comptoir (POS)', tr4d: 'Scannez les articles ou recherchez par nom. Sélectionnez un client pour suivi crédit. Appliquez remises. Imprimez le ticket ou envoyez par partage.',
        tr5: '5. Clôture de Journée', tr5d: 'Consultez le récapitulatif des ventes, vérifiez le bénéfice brut, repörez les clients avec soldes impayés, et exportez votre rapport.',
        btn_back: '← Retour à l\'accueil', btn_open: 'Ouvrir l\'application',

        footer_desc: "SyncloudPOS — le logiciel de caisse intelligent conçu pour les commerces algériens.",
        fl1: 'Fonctionnalités', fl2: 'Support', fl_f: ['Caisse POS', 'Gestion stock', 'Clients & Crédits', 'Import Excel', 'Multi-magasins', 'Formation'],
        fl_s: ['WhatsApp Support', 'Nous contacter', 'Essai gratuit', 'Centre de formation'],
        copyright: '© 2026 SyncloudPOS. Fait avec ❤️ en 🇩🇿 Algérie'
    },
    en: {
        nav1: 'Features', nav2: 'Use Cases', nav3: 'Success Story', nav4: 'Training', nav5: 'Contact', nav_cta: 'Free Trial',
        badge: 'Algerian POS Software', h1a: 'Manage your business', h1b: 'intelligently',
        hdesc: 'SyncloudPOS is the all-in-one software for Algerian businesses. Manage sales, stock, clients and finances in real-time from any device.',
        btn_trial: '🚀 7-Day Free Trial', btn_more: 'See features ↓', btn_wa: '📲 Contact on WhatsApp', btn_wa2: '📲 Order on WhatsApp',
        s_feat: 'Features', s_uc: 'Use Cases', s_suc: 'Success Story', s_how: 'How it works', s_trial: 'Special Offer', s_tar: 'Pricing', s_cont: 'Contact',
        feat_title: 'Everything you need', feat_desc: 'A complete solution designed for Algerian businesses.',
        f1: '🛒 Point of Sale (POS)', f1d: 'Fast checkout, barcode scan, partial payment, customer selection, thermal receipt printing.',
        f2: '📦 Product Management', f2d: 'Products with photos, categories, brands, pricing tiers, minimum stock and multi-barcodes.',
        f3: '👥 Clients & Credits', f3d: 'Client profiles with Tax IDs, purchase history, outstanding balance, credits and debt tracking.',
        f4: '🏭 Suppliers', f4d: 'Algerian tax info, purchase orders, payments, advances and full history.',
        f5: '💰 Cash & Banking', f5d: 'Multiple cash registers and bank accounts in real-time with internal transfers.',
        f6: '📊 Dashboard & Analytics', f6d: 'Revenue, net profit, top products, sales evolution and complete financial reports.',
        f7: '🏪 Multi-Store', f7d: 'Manage multiple points of sale from one account with separate inventories.',
        f8: '📋 Damages & Losses', f8d: 'Log expired or damaged goods. Filter by date and product. Stock updates automatically.',
        f9: '📥 Excel Import', f9d: 'Import products, categories, brands, clients and suppliers from Excel in seconds.',
        f10: '🔒 Staff Permissions', f10d: 'Restricted accounts for staff — control editing and deletion rights per user.',
        f11: '💸 Expenses', f11d: 'Categorize all expenses (rent, salaries, utilities). Integrated with your cash register.',
        f12: '🌍 Multi-Language', f12d: 'French, Arabic and English interface. Switch language anytime without losing data.',
        uc_title: 'Who is SyncloudPOS for?', uc_desc: 'A flexible solution for various sectors in Algeria.',
        uc1: '🛒 Supermarkets', uc1d: 'Ultra-fast checkout with barcode. Expiry management, damages, instant receipts.',
        uc1_l: ['Scan 100s of items/hr', 'Expiry & damage mgmt', 'Auto thermal receipts', 'Low stock alerts'],
        uc2: '🏭 Wholesalers', uc2d: 'Multi-pricing (Wholesale, Reseller, Retail). Client credits, partial payments.',
        uc2_l: ['Wholesale/retail/reseller pricing', 'Integrated delivery notes', 'Credits & partial payments', 'Per-client reports'],
        uc3: '👕 Retail Stores', uc3d: 'Top sales analytics, customer returns, daily income tracking and stock management.',
        uc3_l: ['Excel catalog import', 'HD product photos', 'Daily statistics', 'Returns & discounts'],
        uc4: '💊 Pharmacies', uc4d: 'Instant search across thousands of items. Minimum stock and full supplier integration.',
        uc4_l: ['Instant search', 'Stock shortage alerts', 'Supplier Tax IDs', 'Purchase history'],
        suc_title: 'They trust SyncloudPOS',
        quote: '"Before SyncloudPOS, I wasted hours every night counting cash and had no idea what stock was left. Now I manage my supermarket and wholesale depot from my phone at home. Tracking client credits helped me recover over 400,000 DA in forgotten debts."',
        qauth: 'Ahmed B.', qrole: 'Owner – 2 Supermarkets + 1 Depot, Algiers',
        how_title: 'Get started in 4 simple steps', how_desc: 'Ready to use in minutes, no complex setup required.',
        st1: 'Sign up', st1d: 'Create your free account. Setup in 5 minutes.',
        st2: 'Add your data', st2d: 'Import products, clients and suppliers from Excel.',
        st3: 'Start selling', st3d: 'Use the POS from computer, tablet or phone.',
        st4: 'Track your results', st4d: 'Real-time dashboard: revenue, profit, stock, debts.',
        trial_title: '7-day trial', trial_span: '100% free', trial_desc: 'Test all features with no commitment. No credit card needed.',
        trial_note: '✓ No commitment · ✓ Full access · ✓ Support included',
        tar_title: 'Plans for your business', tar_desc: 'All plans include full access. Contact us for a quote.',
        p1: 'Starter', p1a: 'Custom', p1_note: 'Quote via WhatsApp', p1_feats: ['1 store', 'Unlimited POS', 'Products & Stock', 'Clients & Suppliers', 'Basic reports', 'WhatsApp support'],
        p2: 'Pro', p2a: 'Custom', p2_note: 'Quote via WhatsApp', p2_feats: ['Multi-store', 'All features', 'Excel import', 'Staff permissions', 'Advanced analytics', 'Priority support'],
        p1_btn: 'Request a quote', p2_btn: 'Start free trial',
        cont_title: 'Talk about your business', cont_desc: 'Available 7 days/week on WhatsApp. From installation to training.',
        form_title: 'Quick message', f_name: 'Your name', f_phone: 'WhatsApp number', f_type: 'Business type', f_msg: 'Your message',
        f_ph_name: 'Ex: Ahmed Bensalem', f_ph_phone: '+213 6XX XX XX XX', f_ph_msg: 'I would like to try SyncloudPOS...',
        f_opts: ['Select...', 'Grocery / Food store', 'Wholesale', 'Clothing store', 'Pharmacy', 'Construction materials', 'Electronics', 'Other'],
        f_send: '📲 Send via WhatsApp',
        tr_title: 'Training Center', tr_desc: 'Learn to master SyncloudPOS in minutes. Step-by-step guides.',
        tr1: '1. Initial Setup', tr1d: 'Add your business info: Tax ID, Trade Register, Bank ID. Configure thermal receipt with logo, address and footer.',
        tr2: '2. Adding Products', tr2d: 'Create items with barcode (scan or manual), photos, pricing tiers, category, brand, and alert thresholds.',
        tr3: '3. Excel Import', tr3d: 'Download the template from the app, fill it with your products/clients/suppliers and drag it into the import window.',
        tr4: '4. Counter Sales (POS)', tr4d: 'Scan items or search by name. Select a customer for credit tracking. Apply discounts. Print or share the receipt.',
        tr5: '5. End of Day Close', tr5d: "Review the day's sales summary, check gross profit, identify clients with unpaid balances, and export your report.",
        btn_back: '← Back to home', btn_open: 'Open the app',
        footer_desc: 'SyncloudPOS — the intelligent POS software designed for Algerian businesses.',
        fl1: 'Features', fl2: 'Support', fl_f: ['POS Cashier', 'Inventory', 'Clients & Credits', 'Excel Import', 'Multi-Store', 'Training'],
        fl_s: ['WhatsApp Support', 'Contact us', 'Free trial', 'Training Center'],
        copyright: '© 2026 SyncloudPOS. Made with ❤️ in 🇩🇿 Algeria'
    },
    ar: {
        nav1: 'المميزات', nav2: 'حالات الاستخدام', nav3: 'قصة نجاح', nav4: 'تدريب', nav5: 'اتصل بنا', nav_cta: 'تجربة مجانية',
        badge: 'برنامج نقطة البيع الجزائري', h1a: 'أدر تجارتك', h1b: 'بذكاء',
        hdesc: 'SyncloudPOS هو البرنامج الشامل للتجار الجزائريين — سوبرماركت، محلات، تجار الجملة، صيدليات. إدارة المبيعات والمخزون والعملاء والمالية في الوقت الفعلي.',
        btn_trial: '🚀 تجربة مجانية 7 أيام', btn_more: 'اكتشف المميزات ↓', btn_wa: '📲 تواصل عبر واتساب', btn_wa2: '📲 اطلب عبر واتساب',
        s_feat: 'المميزات', s_uc: 'حالات الاستخدام', s_suc: 'قصة نجاح', s_how: 'كيف يعمل', s_trial: 'عرض خاص', s_tar: 'الأسعار', s_cont: 'اتصل بنا',
        feat_title: 'كل ما تحتاجه للنجاح', feat_desc: 'حل متكامل مصمم للتجار الجزائريين في مختلف القطاعات.',
        f1: '🛒 نقطة البيع (POS)', f1d: 'بيع سريع مع قارئ الباركود، دفع جزئي، اختيار عميل، وطباعة الإيصال الحراري.',
        f2: '📦 إدارة المنتجات', f2d: 'إدارة المنتجات مع صور 300x300، الفئات، الماركات، أسعار الجملة/التجزئة، مخزون أدنى.',
        f3: '👥 العملاء والديون', f3d: 'بطاقات العملاء مع NIF/NIS/NRC/RIB، سجل الشراء، الرصيد المستحق وتتبع الديون.',
        f4: '🏭 الموردون', f4d: 'المعرفات الضريبية الجزائرية، أوامر الشراء، المدفوعات، السلف والتاريخ الكامل.',
        f5: '💰 الخزينة', f5d: 'صناديق متعددة وحسابات بنكية في الوقت الفعلي مع التحويلات الداخلية.',
        f6: '📊 لوحة التحكم', f6d: 'رقم الأعمال، الربح الصافي، أفضل المنتجات وتقارير مالية كاملة.',
        f7: '🏪 متعدد المتاجر', f7d: 'إدارة عدة نقاط بيع من حساب واحد مع مخازن منفصلة.',
        f8: '📋 التلف والخسائر', f8d: 'تسجيل المنتجات المنتهية الصلاحية والتالفة. فلترة حسب التاريخ والمنتج.',
        f9: '📥 استيراد Excel', f9d: 'استوردوا المنتجات والعملاء والموردين من Excel في ثوانٍ مع نموذج جاهز.',
        f10: '🔒 صلاحيات البائعين', f10d: 'حسابات بائعين بصلاحيات محدودة — تحكم في التعديل والحذف.',
        f11: '💸 المصاريف', f11d: 'تصنيف جميع المصاريف (إيجار، رواتب...). مرتبط مع خزينتك مباشرة.',
        f12: '🌍 متعدد اللغات', f12d: 'واجهة بالفرنسية والعربية والإنجليزية. غيّر اللغة في أي وقت.',
        uc_title: 'لمن يصلح SyncloudPOS؟', uc_desc: 'حل مرن لقطاعات متنوعة في الجزائر.',
        uc1: '🛒 السوبر ماركت', uc1d: 'دفع سريع جداً بالباركود. إدارة تواريخ الصلاحية والتلف وطباعة الفواتير.',
        uc1_l: ['مسح مئات العناصر/ساعة', 'إدارة التلف والمنتهي', 'فواتير حرارية تلقائية', 'تنبيهات نقص المخزون'],
        uc2: '🏭 تجار الجملة', uc2d: 'أسعار متعددة (جملة، موزع، تجزئة). تتبع ديون العملاء والدفع بالتقسيط.',
        uc2_l: ['أسعار جملة/تجزئة/موزع', 'وصولات التسليم المدمجة', 'ديون ودفعات جزئية', 'تقارير لكل عميل'],
        uc3: '👕 المحلات التجارية', uc3d: 'تحليل أفضل المبيعات، المرتجعات، تتبع الدخل اليومي وإدارة المخزون.',
        uc3_l: ['استيراد كتالوج Excel', 'صور المنتجات عالية الجودة', 'إحصائيات يومية', 'إدارة المرتجعات والتخفيضات'],
        uc4: '💊 الصيدليات', uc4d: 'بحث فوري بين آلاف الأصناف. حد أدنى للمخزون ودمج الموردين.',
        uc4_l: ['بحث فوري', 'تنبيهات نقص المخزون', 'NIF/NIS للموردين', 'سجل المشتريات'],
        suc_title: 'يثقون في SyncloudPOS',
        quote: '"قبل هذا البرنامج، كنت أضيع ساعات كل ليلة في حساب الصندوق ولم أكن أعرف المخزون المتبقي. اليوم أدير السوبرماركت ومخزن الجملة من هاتفي في المنزل. تتبع ديون العملاء ساعدني في استرداد أكثر من 400,000 دج."',
        qauth: 'أحمد ب.', qrole: 'مالك – 2 سوبرماركت + مخزن، الجزائر العاصمة',
        how_title: 'ابدأ في 4 خطوات بسيطة', how_desc: 'جاهز للاستخدام في دقائق، دون إعداد معقد.',
        st1: 'سجّل حسابك', st1d: 'أنشئ حسابك المجاني. الإعداد في 5 دقائق.',
        st2: 'أضف بياناتك', st2d: 'استورد المنتجات والعملاء والموردين من Excel.',
        st3: 'ابدأ البيع', st3d: 'استخدم نقطة البيع من الكمبيوتر أو الجهاز اللوحي أو الهاتف.',
        st4: 'تابع نتائجك', st4d: 'لوحة تحكم حية: رقم الأعمال، الأرباح، المخزون، الديون.',
        trial_title: 'تجربة لمدة 7 أيام', trial_span: 'مجانية 100%', trial_desc: 'اختبر جميع المميزات بدون التزام. لا بطاقة مصرفية مطلوبة.',
        trial_note: '✓ بدون التزام · ✓ وصول كامل · ✓ الدعم مشمول',
        tar_title: 'باقات لتجارتك', tar_desc: 'جميع الباقات تشمل الوصول الكامل. تواصل معنا للحصول على عرض.',
        p1: 'Starter', p1a: 'حسب الطلب', p1_note: 'عرض سعر عبر واتساب', p1_feats: ['متجر واحد', 'نقطة بيع غير محدودة', 'المنتجات والمخزون', 'عملاء وموردون', 'تقارير أساسية', 'دعم واتساب'],
        p2: 'Pro', p2a: 'حسب الطلب', p2_note: 'عرض سعر عبر واتساب', p2_feats: ['متعدد المتاجر', 'جميع المميزات', 'استيراد Excel', 'صلاحيات البائعين', 'تحليلات متقدمة', 'دعم ذو أولوية'],
        p1_btn: 'طلب عرض سعر', p2_btn: 'ابدأ التجربة المجانية',
        cont_title: 'تحدث عن تجارتك', cont_desc: 'متاح 7 أيام في الأسبوع عبر واتساب. من التثبيت إلى التدريب.',
        form_title: 'رسالة سريعة', f_name: 'اسمك', f_phone: 'رقم واتساب', f_type: 'نوع التجارة', f_msg: 'رسالتك',
        f_ph_name: 'مثال: أحمد بن سالم', f_ph_phone: '+213 6XX XX XX XX', f_ph_msg: 'أود الاطلاع على برنامج SyncloudPOS...',
        f_opts: ['اختر...', 'بقالة / غذاء', 'تجارة جملة', 'محل ملابس', 'صيدلية / شبه طبي', 'مواد البناء', 'إلكترونيات', 'أخرى'],
        f_send: '📲 إرسال عبر واتساب',
        tr_title: 'مركز التدريب', tr_desc: 'تعلم إتقان البرنامج في دقائق. أدلة خطوة بخطوة.',
        tr1: '1. الإعداد الأولي', tr1d: 'أضف معلومات عملك: NIF، NIS، NRC، RIB. اضبط الإيصال الحراري مع الشعار والعنوان.',
        tr2: '2. إضافة المنتجات', tr2d: 'أنشئ عناصر مع الباركود (مسح أو يدوي)، صورة، أسعار، فئة، ماركة، وحد أدنى للمخزون.',
        tr3: '3. استيراد Excel', tr3d: 'حمّل النموذج من التطبيق، أدخل بياناتك (منتجات/عملاء/موردون) واسحبه إلى نافذة الاستيراد.',
        tr4: '4. البيع عند الكاونتر', tr4d: 'امسح العناصر أو ابحث بالاسم. اختر عميل لتتبع الديون. طبّق تخفيضات. اطبع الإيصال.',
        tr5: '5. إغلاق اليوم', tr5d: 'راجع ملخص مبيعات اليوم، تحقق من الربح الإجمالي، حدد العملاء ذوي الأرصدة المعلقة.',
        btn_back: '← العودة للرئيسية', btn_open: 'فتح التطبيق',
        footer_desc: 'SyncloudPOS — برنامج نقطة البيع الذكي للتجار الجزائريين.',
        fl1: 'المميزات', fl2: 'الدعم', fl_f: ['الكاسير POS', 'إدارة المخزون', 'العملاء والديون', 'استيراد Excel', 'متعدد المتاجر', 'التدريب'],
        fl_s: ['دعم واتساب', 'اتصل بنا', 'تجربة مجانية', 'مركز التدريب'],
        copyright: '© 2026 SyncloudPOS. صُنع بـ ❤️ في 🇩🇿 الجزائر'
    }
};

let currentLang = localStorage.getItem('pos_lang') || 'fr';

function setLang(l) {
    currentLang = l;
    localStorage.setItem('pos_lang', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('.lb').forEach(b => b.classList.toggle('active', b.dataset.l === l));
    render();
}

function t(k) { return T[currentLang][k] || T['fr'][k] || ''; }

function render() {
    document.querySelectorAll('[data-t]').forEach(el => {
        el.textContent = t(el.dataset.t);
    });
    document.querySelectorAll('[data-th]').forEach(el => {
        el.innerHTML = t(el.dataset.th);
    });
    document.querySelectorAll('[data-tp]').forEach(el => {
        el.placeholder = t(el.dataset.tp);
    });
}

document.addEventListener('DOMContentLoaded', () => setLang(currentLang));

function sendWA() {
    const n = document.getElementById('fn').value.trim();
    const p = document.getElementById('fp').value.trim();
    const ty = document.getElementById('ft').value;
    const m = document.getElementById('fm').value.trim();
    let msg = 'Bonjour SyncloudPOS!';
    if (n) msg += '\nNom: ' + n;
    if (p) msg += '\nTél: ' + p;
    if (ty) msg += '\nCommerce: ' + ty;
    if (m) msg += '\n' + m;
    else msg += '\nJe voudrais plus d\'informations.';
    window.open(WA + '?text=' + encodeURIComponent(msg), '_blank');
}

function goTrial() { window.location.href = APP_URL; }
