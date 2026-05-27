import { 
    Monitor, ShoppingCart, Package, Receipt, Truck, Wallet, Users, BarChart3, Sparkles 
} from "lucide-react";

export interface FormationStep {
    n: string;
    title: string;
    desc: string;
}

export interface FormationTopic {
    id: string;
    category: "dashboard" | "pos" | "stocks" | "sales" | "purchases" | "treasury" | "contacts" | "delivery" | "analytics";
    icon: any;
    searchTags: string[];
    fr: {
        title: string;
        subtitle: string;
        description: string;
        stepsTitle: string;
        steps: FormationStep[];
        scenarioTitle: string;
        scenarioText: string;
        proTips: string;
    };
    ar: {
        title: string;
        subtitle: string;
        description: string;
        stepsTitle: string;
        steps: FormationStep[];
        scenarioTitle: string;
        scenarioText: string;
        proTips: string;
    };
}

export const FORMATION_TOPICS: FormationTopic[] = [
    {
        id: "dashboard",
        category: "dashboard",
        icon: Monitor,
        searchTags: ["dashboard", "tableau de bord", "kpi", "chiffre d'affaires", "marge", "seuil stock", "statistiques", "الرئيسية", "المبيعات", "الأرباح"],
        fr: {
            title: "Tableau de Bord & KPIs",
            subtitle: "L'aperçu en temps réel de votre établissement",
            description: "Le tableau de bord agrège l'ensemble des transactions de ventes (POS), facturations (BL), dépenses et mouvements de stock pour vous offrir une vision globale en temps réel de votre chiffre d'affaires et de votre santé commerciale.",
            stepsTitle: "Comment exploiter le Tableau de Bord :",
            steps: [
                { n: "1", title: "Analyser les indicateurs clés (KPI)", desc: "Consultez le Chiffre d'Affaires du jour, le nombre de commandes, et calculez la marge brute en direct." },
                { n: "2", title: "Surveiller les Alertes de Stock", desc: "Les produits dont la quantité physique passe sous le seuil d'alerte s'affichent automatiquement en rouge." },
                { n: "3", title: "Suivre la balance des créances", desc: "Visualisez d'un coup d'œil le montant global des crédits clients en attente de recouvrement." }
            ],
            scenarioTitle: "Mise en Situation Réelle",
            scenarioText: "Younes, gérant d'une supérette à Bab Ezzouar (Alger), allume son ordinateur à 8h00. Sur le tableau de bord, le widget d'alerte de stock signale une rupture imminente sur les bouteilles d'eau minérale 1.5L. Il constate également un pic de créances chez son client régulier 'Alimentation Générale El-Amel'. Younes utilise le raccourci d'achats pour commander l'eau auprès de son fournisseur et planifie une relance téléphonique pour le client endetté avant de démarrer sa journée.",
            proTips: "Utilisez le raccourci clavier universel 'Ctrl + K' depuis n'importe quelle page pour faire apparaître la barre de recherche globale d'actions."
        },
        ar: {
            title: "لوحة التحكم والمؤشرات الرئيسية",
            subtitle: "نظرة شاملة ولحظية على نشاطك التجاري",
            description: "تقوم لوحة التحكم بتجميع كل معاملات البيع (POS)، الفواتير (BL)، المصاريف وحركات المخزون لتوفر لك رؤية كاملة ولحظية لرقم أعمال تجارة وصحة مؤسستك.",
            stepsTitle: "كيف تستغل لوحة التحكم :",
            steps: [
                { n: "١", title: "تحليل مؤشرات الأداء (KPIs)", desc: "اطلع على رقم المعاملات اليومي، عدد الطلبيات، واحسب هامش الربح الإجمالي مباشرة." },
                { n: "٢", title: "مراقبة تنبيهات المخزون", desc: "المنتجات التي تنخفض كميتها عن حد الأمان تظهر تلقائياً باللون الأحمر لتفادي نفاد السلعة." },
                { n: "٣", title: "متابعة ديون الزبائن المستحقة", desc: "شاهد بنظرة واحدة إجمالي مبالغ البيع بالكريدي المنتظرة للتحصيل." }
            ],
            scenarioTitle: "سيناريو من الواقع التجاري",
            scenarioText: "يونس، صاحب سوبرماركت في باب الزوار (الجزائر)، يفتح برنامجه على الساعة 8:00 صباحاً. في لوحة التحكم، يلاحظ تنبيهاً باللون الأحمر لنقص مخزون المياه المعدنية 1.5 لتر. كما يرى ارتفاع ديون زبونه المعتاد 'بقالة الأمل'. يستخدم يونس فوراً زر الاختصار لإنشاء طلب شراء للمياه من المورد، ويتصل بـبقالة الأمل لجدولة تسديد جزء من الدين قبل بدء ذروة العمل اليومي.",
            proTips: "اضغط على 'Ctrl + K' من أي صفحة للوصول السريع إلى شريط البحث التفاعلي والبدء في تنفيذ أي إجراء فوراً."
        }
    },
    {
        id: "pos",
        category: "pos",
        icon: ShoppingCart,
        searchTags: ["pos", "caisse", "vendeur", "session", "clavier", "raccourci", "remise", "grossiste", "détail", "barcode", "code-barre", "ticket", "البيع", "صندوق", "القارئ", "التذاكر"],
        fr: {
            title: "Caisse Enregistreuse & POS",
            subtitle: "Encaissement ultra-rapide optimisé pour écrans tactiles et scanners",
            description: "L'interface POS permet d'effectuer les ventes au comptoir à haute fréquence. Elle supporte le scan de codes-barres, les raccourcis clavier, la mise en attente (parking) de paniers et la bascule automatique entre tarifs détail/gros.",
            stepsTitle: "Les 3 étapes d'une vente en caisse :",
            steps: [
                { n: "1", title: "Scanner ou Chercher le Produit", desc: "Passez le code-barre devant le lecteur ou tapez le nom. Modifiez la quantité (quantité négative pour les retours)." },
                { n: "2", title: "Bascule des Tarifs & Clients", desc: "Associez un client à la vente. Si c'est un grossiste, l'ERP applique automatiquement le tarif 'Prix Gros' programmé." },
                { n: "3", title: "Encaisser & Imprimer [F9]", desc: "Appuyez sur F9, saisissez le montant reçu. L'ERP calcule la monnaie et imprime le ticket thermique scannable." }
            ],
            scenarioTitle: "Mise en Situation Réelle",
            scenarioText: "Dans un grand magasin de quincaillerie à El Eulma (Sétif), c'est la cohue de fin de journée. Un client se présente avec 50 disques à tronçonner. Le caissier tape 'F8' pour ouvrir une recherche de client, sélectionne 'Eurl Bouaziz' (grossiste), ce qui bascule instantanément tous les articles en 'Prix de Gros'. Au même moment, un client pressé veut juste payer une bouteille d'eau. Le caissier clique sur 'Mettre en Attente', ouvre un panier vierge, encaisse l'eau, puis restaure le panier de gros pour finaliser la transaction B2B.",
            proTips: "Raccourcis clavier POS utiles : 'F9' pour encaisser, 'F2' pour chercher un produit, 'Espace' pour valider le mode de paiement principal."
        },
        ar: {
            title: "نقطة البيع والصندوق (POS)",
            subtitle: "تسجيل المبيعات بسرعة فائقة متوافق مع شاشات اللمس وقارئ الكودبار",
            description: "واجهة نقطة البيع مخصصة للعمليات المباشرة والسريعة. تدعم المسح الضوئي، اختصارات لوحة المفاتيح، تعليق السلات مؤقتاً، والتحويل التلقائي بين أسعار التجزئة وأسعار الجملة.",
            stepsTitle: "٣ خطوات لتسجيل عملية بيع :",
            steps: [
                { n: "١", title: "قراءة الكودبار أو البحث عن السلعة", desc: "مرر السلعة أمام القارئ أو ابحث بالاسم. لتسجيل إرجاع سلعة، أدخل كمية سالبة (مثل ١-)." },
                { n: "٢", title: "تحديد الزبون ونوع السعر", desc: "اختر الزبون؛ إذا كان مسجلاً كتاجر جملة، يقوم النظام تلقائياً بتحويل كل الأسعار إلى 'سعر الجملة'." },
                { n: "٣", title: "القبض وطباعة التذكرة [F9]", desc: "اضغط على F9، أدخل المبلغ المستلم. يحسب النظام الصرف المتبقي ويطبع الوصل الحراري مباشرة." }
            ],
            scenarioTitle: "سيناريو من الواقع التجاري",
            scenarioText: "في متجر كبير لقطع الغيار بالعلمة (سطيف)، يزدحم المحل مساءً. يتقدم زبون لشراء 50 شمعة احتراق. يضغط البائع على 'F8'، يختار زبونه 'مؤسسة بوعزيز'، فتتحول أسعار كل القطع فوراً لـ 'سعر الجملة'. فجأة يتدخل زبون آخر يريد شراء قارورة ماء بسرعة؛ يقوم البائع بـ 'تعليق السلة' الحالية، ويفتح سلة جديدة، يبيع الماء، ثم يسترجع سلة الجملة المعلقة بضغطة زر واحدة ليكمل الحساب مع بوعزيز دون تضييع الوقت.",
            proTips: "اختصارات لوحة مفاتيح الصندوق: 'F9' لفتح نافذة القبض والتسديد، 'F2' للبحث السريع عن منتج، وزر 'المسافة' لتأكيد الدفع نقداً."
        }
    },
    {
        id: "stocks",
        category: "stocks",
        icon: Package,
        searchTags: ["stocks", "catalogue", "produit", "unite", "carton", "mouvement", "ajustement", "inventaire annuel", "etiquettes", "مخزن", "السلع", "تعديل المخزون", "كود بار"],
        fr: {
            title: "Gestion des Stocks & Catalogue",
            subtitle: "Maîtrisez votre inventaire, vos mouvements et vos étiquettes",
            description: "Ce module assure la traçabilité complète de vos articles. Il gère la création de produits avec tarifs multiples, les conversions carton/unité, les mouvements d'ajustement (pertes, avaries) et le rapprochement de stock par inventaire annuel.",
            stepsTitle: "Processus d'un Inventaire Annuel :",
            steps: [
                { n: "1", title: "Créer une fiche d'inventaire", desc: "Sélectionnez le magasin ou la catégorie d'articles à compter physiquement." },
                { n: "2", title: "Saisir les quantités réelles", desc: "Renseignez le nombre exact d'articles comptés sur vos étagères." },
                { n: "3", title: "Valider le rapprochement", desc: "L'ERP calcule les écarts et génère automatiquement les écritures d'ajustement pour correspondre au stock physique." }
            ],
            scenarioTitle: "Mise en Situation Réelle",
            scenarioText: "Le gestionnaire de stock d'un dépôt de cosmétiques à Constantine prépare l'inventaire physique. En comptant les parfums de marque 'Ghazal', il s'aperçoit qu'il n'y a que 88 bouteilles sur l'étagère alors que l'ordinateur en affiche 95. Il saisit '88' dans la fiche d'inventaire. L'ERP calcule un écart de -7 bouteilles et génère un mouvement d'ajustement automatique qualifié en 'Avaries/Pertes', rétablissant la vérité financière de l'actif.",
            proTips: "Configurez l'équivalence carton (ex: 1 carton = 24 unités) : vous pourrez scanner un carton pour incrémenter le stock de 24 pièces en un instant !"
        },
        ar: {
            title: "إدارة المخازن وقائمة السلع",
            subtitle: "تحكم كامل في جرد السلع، حركاتها وطباعة الكودبار",
            description: "يضمن هذا القسم التتبع الشامل للمنتجات. يدير إنشاء السلع بأسعار متعددة، التحويل بين العلبة والقطعة، تسجيل حركات التعديل (التلف أو الضياع)، وعمليات الجرد السنوي.",
            stepsTitle: "خطوات القيام بالجرد السنوي للمخزن :",
            steps: [
                { n: "١", title: "إنشاء ورقة جرد جديدة", desc: "حدد المستودع أو فئة المنتجات المراد جردها وعدّها في الواقع." },
                { n: "٢", title: "إدخال الكميات الحقيقية", desc: "اكتب العدد الفعلي الموجود في الرفوف لكل منتج." },
                { n: "٣", title: "تأكيد ومطابقة المخزون", desc: "يحسب النظام الفروقات تلقائياً ويقوم بتسجيل حركات التعديل ليتطابق مخزون الكمبيوتر مع الواقع." }
            ],
            scenarioTitle: "سيناريو من الواقع التجاري",
            scenarioText: "يستعد مدير المخزن في مستودع لمواد التجميل بقسنطينة للقيام بالجرد الفعلي. عند عد عطر 'غزال'، يجد 88 قارورة في الرف بينما يعرض البرنامج 95 قارورة. يكتب '88' في جدول الجرد بالبرنامج. يحسب النظام فوراً نقصاً بـ 7 قارورات ويسجل حركة تعديل تلقائية تحت بند 'تالف/ضائع'، مما يضمن صحة قيمة رأس المال في الحسابات.",
            proTips: "قم بإعداد نسبة التحويل (مثال: ١ علبة تحتوي على ٢٤ قطعة)، لتتمكن من مسح علبة واحدة ضوئياً فيضاف ٢٤ قطعة للمخزون فوراً !"
        }
    },
    {
        id: "sales",
        category: "sales",
        icon: Receipt,
        searchTags: ["sales", "ventes", "bl", "bon de livraison", "facture", "proforma", "devis", "timbre fiscal", "credit", "timbre", "الفواتير", "البيع بالكريدي", "توصيل", "بروفورما"],
        fr: {
            title: "Ventes, BL & Facturation",
            subtitle: "Gérez vos livraisons B2B, vos crédits et vos factures A4",
            description: "Pour vos clients professionnels et grossistes, ce module orchestre les transactions complexes : factures proforma (devis), bons de livraison (BL) diminuant le stock physique, factures fiscales A4 avec timbre de dimension (1% pour paiement espèces) et suivi automatique du crédit client.",
            stepsTitle: "Le cycle de vente idéal :",
            steps: [
                { n: "1", title: "Établir une Facture Proforma", desc: "Saisissez les tarifs négociés pour le client sans modifier l'état de vos stocks physiques." },
                { n: "2", title: "Convertir en Bon de Livraison (BL)", desc: "En un clic après accord, la proforma devient un BL. Le stock est déduit et la dette client est mise à jour." },
                { n: "3", title: "Générer la Facture A4 avec Timbre", desc: "Si le règlement est en espèces, l'ERP calcule la taxe de timbre de 1% (règlementation algérienne) pour l'éditer en PDF." }
            ],
            scenarioTitle: "Mise en Situation Réelle",
            scenarioText: "Un client se présente chez un grossiste en électricité à Oran pour un devis concernant 100 projecteurs LED. Le commercial lui imprime une 'Facture Proforma' valable 15 jours. Le client revient le lendemain avec son accord. Le commercial clique sur 'Convertir en BL'. Le client paie 80 000 DA en espèces et laisse le reste à crédit. L'ERP intègre un timbre fiscal de 800 DA sur la facture finale et rajoute le solde restant sur son extrait de compte client.",
            proTips: "Un client a atteint son plafond de crédit ? L'ERP vous affichera un message d'alerte rouge et bloquera la validation du BL jusqu'à régularisation."
        },
        ar: {
            title: "المبيعات، وصولات التوصيل (BL) والفواتير",
            subtitle: "إدارة تسليم السلع للشركات، مبيعات الأجل (الكريدي) والفواتير الرسمية",
            description: "هذا القسم مخصص للتعاملات الكبرى (B2B). يدير الفواتير الأولية (Proforma)، وصولات التوصيل (BL) التي تخصم السلعة من المخزن، الفواتير الرسمية A4 مع حساب الطابع الجبائي (1% للدفع الكاش)، ومتابعة سقف الديون لكل زبون.",
            stepsTitle: "دورة البيع المثالية في النظام :",
            steps: [
                { n: "١", title: "إنشاء فاتورة شكلية (Proforma)", desc: "أدخل الأسعار المتفق عليها للزبون دون أن تؤثر العملية على كمية المخزن." },
                { n: "٢", title: "التحويل إلى وصل توصيل (BL)", desc: "بضغطة زر واحدة بعد الموافقة، يتحول العرض لـ BL لتخصم السلع من المخزن ويسجل الدين." },
                { n: "٣", title: "إصدار الفاتورة الرسمية بالطابع", desc: "إذا كان التسديد نقداً، يحسب البرنامج تلقائياً طابع البعد بنسبة 1% وفقاً للقانون الجزائري." }
            ],
            scenarioTitle: "سيناريو من الواقع التجاري",
            scenarioText: "يطلب زبون من بائع أدوات كهربائية في وهران تسعيرة لـ 100 مصباح LED. يطبع له البائع 'فاتورة شكلية (Proforma)'. يعود الزبون في اليوم الموالي معلناً موافقته؛ يضغط البائع على زر 'تحويل إلى وصل BL'. يدفع الزبون 80,000 دج نقداً والباقي بالكريدي. يحسب النظام تلقائياً طابعاً بقيمة 800 دج ويضيف الباقي في كشف حساب الزبون المالي.",
            proTips: "إذا تجاوز الزبون سقف الدين المسموح به، سيعرض النظام تحذيراً أحمر ويمنع تأكيد وصل التوصيل حتى يسدد جزءاً من ديونه السابقة."
        }
    },
    {
        id: "purchases",
        category: "purchases",
        icon: Truck,
        searchTags: ["purchases", "achats", "depenses", "fournisseur", "bon d'achat", "ocr", "intelligence artificielle", "charge", "المشتريات", "المورد", "المصاريف", "سحب الفواتير"],
        fr: {
            title: "Achats, Charges & Saisie IA OCR",
            subtitle: "Incrémentez vos stocks et automatisez la saisie de vos factures",
            description: "Ce module gère vos réapprovisionnements auprès des fournisseurs et vos charges d'exploitation. Grâce à notre IA OCR avancée, vous pouvez scanner une facture fournisseur papier pour remplir automatiquement vos lignes de produits en quelques secondes.",
            stepsTitle: "Comment utiliser la Saisie Automatique par IA (OCR) :",
            steps: [
                { n: "1", title: "Photographier ou Importer", desc: "Prenez une photo nette du bon d'achat du fournisseur ou importez le fichier PDF." },
                { n: "2", title: "Laisser l'IA analyser", desc: "L'intelligence artificielle extrait le nom du fournisseur, liste les produits, détecte les quantités et les prix d'achat." },
                { n: "3", title: "Valider l'entrée de stock", desc: "Vérifiez les lignes lues par l'IA et cliquez sur Valider. Vos stocks physiques augmentent instantanément !" }
            ],
            scenarioTitle: "Mise en Situation Réelle",
            scenarioText: "Ahmed, gérant d'une supérette à Alger, reçoit une livraison hebdomadaire de 35 produits différents de chez son grossiste avec une facture manuscrite complexe. Fatigué de saisir les codes et prix un par un, il prend le document papier en photo avec son téléphone via l'ERP. L'IA extrait les 35 lignes, fait correspondre les articles avec son catalogue existant et met à jour les prix d'achat. En 20 secondes, son stock est rechargé et à jour.",
            proTips: "Assurez-vous de prendre la photo bien à plat et dans un endroit lumineux pour que l'IA OCR extrait les données avec une précision de 100%."
        },
        ar: {
            title: "المشتريات، المصاريف والمسح الذكي IA OCR",
            subtitle: "أدخل سلعك للمخزن تلقائياً وسجل مصاريف التشغيل بنقرة واحدة",
            description: "يسمح لك هذا القسم بإدخال فواتير المشتريات من الموردين وتتبع مصاريف المحل. بفضل تقنية الذكاء الاصطناعي (OCR)، يمكنك تصوير فاتورة المورد الورقية ليقوم النظام بإدخال كل المنتجات والأسعار تلقائياً.",
            stepsTitle: "كيفية استعمال السحب التلقائي بالذكاء الاصطناعي (OCR) :",
            steps: [
                { n: "١", title: "تصوير الفاتورة أو رفعها", desc: "التقط صورة واضحة لفاتورة المورد الورقية أو ارفع ملف PDF الخاص بها." },
                { n: "٢", title: "تحليل الذكاء الاصطناعي", desc: "يستخرج النظام اسم المورد، يدرج المنتجات، ويكتشف الكميات وأسعار الشراء تلقائياً." },
                { n: "٣", title: "تأكيد الدخول للمخزن", desc: "راجع السطور المستخرجة واضغط على تأكيد؛ لترتفع كميات سلعك في المخازن في لحظة !" }
            ],
            scenarioTitle: "سيناريو من الواقع التجاري",
            scenarioText: "يتلقى أحمد، صاحب متجر بالجزائر العاصمة، طلبيته الأسبوعية المكونة من 35 منتجاً مختلفاً من الموزع مصحوبة بفاتورة ورقية معقدة. لتفادي إدخال المنتجات يدوياً واحداً تلو الآخر، يقوم بالتقاط صورة للفاتورة الورقية بهاتفه عبر البرنامج. يستخرج الذكاء الاصطناعي 35 سطراً بأسعارها ويطابقها مع كتالوج المحل. في 20 ثانية فقط، تم تحديث المخازن والأسعار بنجاح.",
            proTips: "التقط صورة الفاتورة الورقية بشكل مستقيم وفي إضاءة جيدة لضمان قراءة الذكاء الاصطناعي للبيانات بنسبة ١٠٠%."
        }
    },
    {
        id: "treasury",
        category: "treasury",
        icon: Wallet,
        searchTags: ["treasury", "tresorerie", "compte", "caisse", "banque", "ccp", "virement", "transfert", "cheque", "reconciliation", "الخزينة", "حساب", "البنك", "تحويل مالي", "شيكات"],
        fr: {
            title: "Trésorerie, Comptes & Chèques",
            subtitle: "Gérez vos liquidités, vos transferts et le cycle de vie de vos chèques",
            description: "Le module Trésorerie pilote l'ensemble de vos flux financiers. Il vous permet de configurer plusieurs comptes (Caisse principale, Coffre, Comptes bancaires, CCP) et d'effectuer des virements internes tout en suivant avec précision les encaissements par chèque.",
            stepsTitle: "Suivi d'un chèque reçu :",
            steps: [
                { n: "1", title: "Enregistrer le Chèque", desc: "Lors du paiement d'une facture, sélectionnez le mode Chèque, entrez le numéro et la banque émettrice. Le chèque passe en statut 'En attente'." },
                { n: "2", title: "Déposer en Banque", desc: "Lorsque vous remettez le chèque physiquement à votre banque, changez son statut sur l'ERP en 'Déposé'." },
                { n: "3", title: "Valider l'Encaissement", desc: "Une fois les fonds crédités sur votre relevé, validez le chèque. Le solde du compte Banque augmente automatiquement." }
            ],
            scenarioTitle: "Mise en Situation Réelle",
            scenarioText: "Un gérant à Tizi Ouzou encaisse un chèque de caution de 500 000 DA de la part d'un client. Il l'enregistre dans le 'Gestionnaire de Chèques'. En fin de journée, il doit payer un transporteur de marchandise en espèces. N'ayant pas assez de liquide dans son tiroir de caisse, il effectue un transfert de 50 000 DA de son 'Compte BNA' vers sa 'Caisse Principale' dans l'ERP, assurant une parfaite correspondance avec ses transferts physiques.",
            proTips: "Un chèque est revenu impayé ? Marquez-le en 'Bounced/Impayé' : l'ERP récréditera immédiatement la dette sur la fiche du client concerné."
        },
        ar: {
            title: "الخزينة، الحسابات المالية والشيكات",
            subtitle: "متابعة السيولة النقدية، التحويلات الداخلية وحالة الشيكات",
            description: "يقود هذا القسم كل التدفقات المالية للمؤسسة. يسمح لك بإنشاء حسابات متعددة (الصندوق الرئيسي، الخزنة الحديدية، حساب بنكي، حساب بريدي CCP)، وتتبع الشيكات المستلمة من الزبائن بدقة.",
            stepsTitle: "دورة تتبع الشيكات الواردة :",
            steps: [
                { n: "١", title: "تسجيل الشيك المستلم", desc: "عند قبض شيك من زبون، اختر الدفع بالشيك وأدخل رقمه والبنك؛ ليدخل قائمة الشيكات بوضعية 'قيد الانتظار'." },
                { n: "٢", title: "إيداع الشيك في البنك", desc: "عند أخذ الشيك وتسليمه فعلياً للبنك، قم بتغيير حالته في البرنامج إلى 'تم إيداعه'." },
                { n: "٣", title: "تأكيد التحصيل والقبض", desc: "عند دخول الأموال لحسابك البنكي، أكد العملية ليرتفع رصيد حسابك البنكي في البرنامج تلقائياً." }
            ],
            scenarioTitle: "سيناريو من الواقع التجاري",
            scenarioText: "يستلم تاجر في تيزي وزو شيكاً بمبلغ 500,000 دج من أحد الزبائن. يسجله في 'إدارة الشيكات'. مساءً، يحتاج لدفع أجرة ناقل البضائع نقداً؛ وبسبب نقص السيولة في صندوق المحل، يقوم بإجراء 'تحويل مالي داخلي' بقيمة 50,000 دج من 'حساب بنك BNA' إلى 'الصندوق الرئيسي' في البرنامج لتوثيق حركة الأموال بدقة.",
            proTips: "إذا تم رفض شيك من طرف البنك، غير حالته في البرنامج إلى 'مرفوض'؛ ليعيد النظام فوراً قيد هذا المبلغ كدين على حساب الزبون."
        }
    },
    {
        id: "contacts",
        category: "contacts",
        icon: Users,
        searchTags: ["contacts", "clients", "fournisseurs", "dettes", "balance", "credit client", "extrait de compte", "import excel", "الزبائن", "الموردين", "الديون", "كشف الحساب"],
        fr: {
            title: "Clients, Fournisseurs & Dettes (CRM)",
            subtitle: "Gérez vos relations commerciales et optimisez le recouvrement des dettes",
            description: "Ce module centralise vos bases clients et fournisseurs. Il pilote les soldes créditeurs/débiteurs, applique des plafonds de crédit et permet d'éditer en un clic l'Extrait de Compte Client (Fiche de situation financière avec historique des BL et versements).",
            stepsTitle: "Comment fonctionne la balance de dette :",
            steps: [
                { n: "1", title: "Vente à crédit (Dette augmentée)", desc: "Vous validez un BL sans encaissement total. Le solde du client devient négatif. Il vous doit cet argent." },
                { n: "2", title: "Enregistrer un Versement", desc: "Le client effectue un acompte. Vous créez un Reçu de Versement lié à sa fiche. Son solde remonte vers zéro." },
                { n: "3", title: "Extrait de Compte PDF [A4]", desc: "Filtrez par date et imprimez l'historique croisé de ses achats et de ses paiements pour justifier son solde exact." }
            ],
            scenarioTitle: "Mise en Situation Réelle",
            scenarioText: "Karim, un client d'un grossiste à Boumerdès, conteste le montant de sa dette affichée (120 000 DA). Le gérant ouvre sa fiche sur l'ERP, clique sur 'Extrait de Compte', filtre les dates depuis le 1er janvier et exporte le PDF A4. Le document liste chaque BL avec le détail des produits et chaque versement avec son reçu. Face à cette transparence indiscutable, Karim accepte le montant et effectue un versement immédiat de 70 000 DA.",
            proTips: "Utilisez le modèle d'import Excel disponible dans le panneau d'administration pour charger une liste de 2 000 clients ou articles en moins d'une minute."
        },
        ar: {
            title: "الزبائن، الموردين وإدارة الديون",
            subtitle: "تسيير قاعدة العملاء، تحصيل المستحقات ومتابعة كشوفات الحساب",
            description: "يجمع هذا القسم كل تفاصيل شركائك التجاريين. يتحكم في أرصدة الديون الدائنة والمدينة، يحدد سقف الائتمان، ويتيح طباعة 'كشف حساب الزبون' A4 الذي يحتوي على كل وصولات التوصيل والمدفوعات التاريخية.",
            stepsTitle: "كيفية عمل توازن الديون في النظام :",
            steps: [
                { n: "١", title: "البيع بالآجل (زيادة الدين)", desc: "تأكيد وصل BL دون قبض كامل للمبلغ؛ يصبح رصيد الزبون سالباً (أي أنه مدين لك بالمال)." },
                { n: "٢", title: "تسجيل دفعة جديدة (قبض)", desc: "عندما يدفع الزبون مبلغاً، تسجل وصل دفعة في حسابه ليرتفع رصيده ويقترب من الصفر." },
                { n: "٣", title: "طباعة كشف الحساب A4", desc: "فلتر بالتاريخ واطبع تقريراً يوضح كل مشترياته بالتفصيل مع كل المدفوعات لتبرير حسابه الحقيقي." }
            ],
            scenarioTitle: "سيناريو من الواقع التجاري",
            scenarioText: "كريم، زبون لدى موزع بومرداس، يعترض على قيمة دينه المعروضة (120,000 دج). يفتح المسير ملفه بالبرنامج، يضغط على 'كشف الحساب'، يفلتر منذ بداية السنة ويطبع وثيقة A4 الرسمية. يعرض الكشف كل وصل BL وتفاصيل المنتجات مع كل تسديد وتاريخه. أمام هذا التوثيق الدقيق والواضح، يقتنع كريم ويدفع فوراً مبلغ 70,000 دج كجزء من دينه.",
            proTips: "استخدم نموذج الاستيراد بصيغة Excel المتاحة لرفع قائمة تحتوي على آلاف الزبائن أو المنتجات في أقل من دقيقة !"
        }
    },
    {
        id: "delivery",
        category: "delivery",
        icon: Truck,
        searchTags: ["delivery", "livraison", "tournee", "chauffeur", "camion", "transit", "yalidine", "dhd", "hdd", "colis", "gps", "شحن", "توصيل", "سائق", "شاحنة", "يالدين"],
        fr: {
            title: "Livraison, Yalidine & App Chauffeurs",
            subtitle: "Gérez vos colis E-commerce et vos tournées logistiques B2B",
            description: "Ce module gère deux aspects logistiques clés : d'une part, les livraisons E-commerce via l'intégration native des API Yalidine, DHD ou HDD pour générer les étiquettes et synchroniser les statuts ; d'autre part, les tournées B2B de camions de distribution avec chargement, gestion des stocks en transit, application mobile Chauffeur et suivi GPS.",
            stepsTitle: "Le flux logistique d'une Tournée Chauffeur :",
            steps: [
                { n: "1", title: "Créer la Tournée & Assigner", desc: "Créez une tournée sur l'ERP, désignez le chauffeur Slimane et ajoutez la liste des clients B2B à livrer." },
                { n: "2", title: "Charger le Camion (Transit)", desc: "Sélectionnez les quantités à charger. L'ERP déduit le stock du dépôt central pour le transférer dans le stock virtuel 'Transit Chauffeur'." },
                { n: "3", title: "Application Mobile & Clôture", desc: "Le chauffeur utilise l'application mobile pour valider les livraisons, encaisser les paiements et enregistrer les retours de marchandises." }
            ],
            scenarioTitle: "Mise en Situation Réelle",
            scenarioText: "Un distributeur de boissons à Blida prépare sa livraison pour la côte de Tipaza. Il charge 150 packs de sodas dans le camion de son chauffeur Slimane. Le stock passe en 'Transit Chauffeur'. Sur la route, Slimane utilise l'application mobile (qui fonctionne hors-ligne) pour livrer 4 clients, encaisse 90 000 DA en espèces et accepte 3 packs retournés pour casse. De retour au dépôt, l'ERP comptabilise les 90 000 DA dans la caisse de Slimane et réintègre les stocks restants au dépôt principal.",
            proTips: "Intégration Yalidine : configurez vos webhooks sur votre compte Yalidine pour que les statuts de vos colis (Livré, Retourné, Échoué) se mettent à jour automatiquement sur l'ERP en temps réel."
        },
        ar: {
            title: "الشحن، التوصيل وتسيير الشاحنات (يالدين)",
            subtitle: "إدارة طرود التجارة الإلكترونية وخطوط توزيع السلع وشاحنات التوصيل",
            description: "يدير هذا القسم اللوجستيات من جانبين: أولاً، طرود التجارة الإلكترونية عبر ربط API Yalidine/DHD/HDD لطباعة الملصقات وتتبع الطرود تلقائياً؛ ثانياً، خطوط التوزيع B2B للشاحنات، جرد البضائع قيد العبور (Transit)، وتطبيق السائق الهاتفي.",
            stepsTitle: "خطوات تسيير شاحنة توصيل وتوزيع :",
            steps: [
                { n: "١", title: "إنشاء خط التوصيل وتحديد السائق", desc: "أنشئ خط التوصيل في البرنامج، عين السائق 'سليمان'، وأضف قائمة الزبائن المراد زيارتهم." },
                { n: "٢", title: "شحن الشاحنة (السلع قيد العبور)", desc: "حدد الكميات المشحونة؛ يخصم النظام السلعة من مخزن المستودع الرئيسي ويضعها في مخزن 'عبور شاحنة سليمان'." },
                { n: "٣", title: "تطبيق السائق وإغلاق الجولة", desc: "يستخدم السائق هاتفه لتأكيد التسليم للزبائن، تحصيل المبالغ، وتسجيل المرتجعات المرفوضة." }
            ],
            scenarioTitle: "سيناريو من الواقع التجاري",
            scenarioText: "يقوم موزع مشروبات بالبليدة بتجهيز شاحنة السائق 'سليمان' المتوجهة لتيبازة. يشحن فيها 150 علبة عصير؛ تنتقل السلعة في البرنامج إلى وضعية 'قيد العبور شاحنة سليمان'. في الطريق، يستخدم سليمان التطبيق (يعمل بدون إنترنت) لتأكيد التسليم لـ 4 زبائن، ويقبض 90,000 دج نقداً ويسجل علبتين مرتجعتين لتلفهما. عند عودته للمخزن، يقوم البرنامج بمطابقة الحسابات وتحديث الصندوق الرئيسي وإعادة السلع المتبقية.",
            proTips: "ربط يالدين (Yalidine): قم بإعداد الـ Webhooks في حسابك ليتغير وضع الطرود في البرنامج (تم التسليم، مرفوض، قيد الشحن) تلقائياً ولحظياً."
        }
    },
    {
        id: "analytics",
        category: "analytics",
        icon: BarChart3,
        searchTags: ["analytics", "analyses", "rapports", "marges", "fiscalite", "g50", "g12", "timbre", "tva", "tap", "comptable", "التقارير", "الضرائب", "الربح الصافي", "ج٥٠"],
        fr: {
            title: "Analyses, Marges & Fiscalité G50",
            subtitle: "Pilotez la rentabilité de votre entreprise et simplifiez vos déclarations fiscales",
            description: "Ce module compile vos données de vente et d'achat pour calculer avec précision vos marges bénéficiaires nettes (déduction faite des charges et dépenses). Il génère également les bases imposables de la déclaration fiscale mensuelle algérienne G50 (TVA, TAP, Timbre).",
            stepsTitle: "Les composants clés de votre rentabilité :",
            steps: [
                { n: "1", title: "Bénéfice Brut vs Bénéfice Net", desc: "Bénéfice Brut = Ventes − Coût d'achat de la marchandise. Bénéfice Net = Bénéfice Brut − charges d'exploitation (loyers, électricité, salaires)." },
                { n: "2", title: "Rapport de Fiscalité G50", desc: "L'ERP compile automatiquement les assiettes de TVA (9% et 19%), de la TAP (Taxe sur l'Activité Professionnelle) et les timbres sur paiements cash." },
                { n: "3", title: "Export pour le Comptable", desc: "Exportez les journaux de vente et d'achat mensuels filtrés pour les remettre directement à votre cabinet comptable." }
            ],
            scenarioTitle: "Mise en Situation Réelle",
            scenarioText: "À la fin du mois, un gérant à Chéraga (Alger) doit préparer sa déclaration fiscale G50. Au lieu de passer des heures avec sa calculatrice et ses factures papier, il ouvre le rapport 'Fiscalité G50' sur l'ERP. En 5 secondes, il obtient le montant exact des ventes soumises à la TVA de 19%, la TVA de 9%, le timbre fiscal collecté et la TAP. Il recopie ces chiffres directement sur le formulaire officiel rose G50, évitant toute erreur de calcul.",
            proTips: "Attribuez le bon taux de TVA à chaque produit dans votre catalogue. C'est la garantie d'avoir un rapport G50 automatisé 100% exact et conforme à la loi de finances."
        },
        ar: {
            title: "التحليلات، الأرباح والضرائب (G50)",
            subtitle: "راقب هامش الربح لمؤسستك وسهل إعداد تقارير الضرائب الرسمية",
            description: "يقوم هذا القسم بجمع كل بيانات البيع والشراء ليحسب بدقة هوامش الأرباح الصافية (بعد خصم المصاريف والأجور). كما يولد الأرقام الخاصة بالتصريح الضريبي الشهري بالجزائر ج50 (TVA, TAP, الطابع الجبائي).",
            stepsTitle: "عناصر تحليل أرباحك في النظام :",
            steps: [
                { n: "١", title: "الربح الإجمالي مقابل الربح الصافي", desc: "الربح الإجمالي = المبيعات − تكلفة الشراء. الربح الصافي = الربح الإجمالي − مصاريف التشغيل (كراء، كهرباء، أجور)." },
                { n: "٢", title: "تقرير تصريح الضرائب ج٥٠", desc: "يجمع البرنامج تلقائياً قيم الرسم على القيمة المضافة (TVA 9% & 19%)، والرسم على النشاط المهني (TAP) وطوابع الدفع نقداً." },
                { n: "٣", title: "التصدير للمحاسب المالي", desc: "قم بتصدير دفاتر المبيعات والمشتريات الشهرية بصيغة إكسل لإرسالها مباشرة إلى مكتب المحاسبة الخاص بك." }
            ],
            scenarioTitle: "سيناريو من الواقع التجاري",
            scenarioText: "في نهاية الشهر، يتجهز تاجر في شراقة (الجزائر) لإعداد تصريح الضرائب ج50. بدلاً من قضاء ساعات طويلة في مراجعة فواتير الورق، يفتح صفحة تقرير 'ضريبة G50' بالبرنامج. في ثوانٍ معدودة، يحصل على إجمالي المبيعات الخاضعة للرسم 19% والـ 9%، قيمة الـ TAP المستحقة وقيمة الطوابع المجمعة. يقوم بنقل هذه الأرقام مباشرة لاستمارة G50 الرسمية بكل ثقة وسرعة.",
            proTips: "حدد معدل الضريبة (TVA) الصحيح لكل منتج في كتالوج سلعك، فهذا يضمن لك الحصول على تقرير G50 تلقائي وصحيح ١٠٠% ومطابق للقوانين المالية."
        }
    }
];
