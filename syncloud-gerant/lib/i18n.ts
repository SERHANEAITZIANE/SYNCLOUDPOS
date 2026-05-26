import { create } from "zustand";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Lang = "fr" | "ar";

const translations = {
    fr: {
        // Navigation
        myTour: "Ma Tournée",
        clients: "Clients",
        today: "Aujourd'hui",
        settings: "Paramètres",

        // Login
        login: "Se connecter",
        email: "Email",
        password: "Mot de passe",
        loginError: "Erreur de connexion",
        fillAllFields: "Veuillez remplir tous les champs",

        // Tour
        tourOfDay: "Tournée du jour",
        noTourToday: "Aucune tournée aujourd'hui",
        createFromWeb: "Créez une tournée depuis le dashboard web",
        start: "Démarrer",
        close: "Clôturer",
        closeTour: "Clôturer la tournée",
        closeConfirm: "Voulez-vous vraiment terminer cette tournée ?",
        truckLoad: "Chargement Camion",
        cancel: "Annuler",
        error: "Erreur",

        // Stop status
        pending: "En attente",
        enRoute: "En route",
        delivered: "Livré",
        absent: "Absent",
        skipped: "Sauté",
        partial: "Partiel",

        // Stop actions
        gps: "GPS",
        bl: "BL",
        pay: "Payer",
        returnLabel: "Retour",
        balance: "Solde",
        call: "Appeler",
        whatsapp: "WhatsApp",

        // CreateBL
        newBL: "Nouveau BL",
        searchProduct: "Rechercher un produit...",
        cart: "Panier",
        article: "article",
        articles: "articles",
        payment: "Paiement",
        cash: "Espèces",
        check: "Chèque",
        transfer: "Virement",
        amountPaid: "Montant payé (DA)",
        confirmBL: "Confirmer le BL",
        validateBL: "Valider BL",
        totalTTC: "TOTAL TTC",
        blCreated: "BL Créé",
        print: "Imprimer",
        share: "Partager",
        closeLbl: "Fermer",

        // Payment
        collection: "Encaissement",
        paymentAmount: "MONTANT DU PAIEMENT",
        paymentMethod: "MODE DE PAIEMENT",
        registerPayment: "Enregistrer le paiement",
        paymentRegistered: "Paiement enregistré",
        invalidAmount: "Montant invalide",
        confirmPayment: "Confirmer le paiement",
        oldBalance: "Ancien solde",
        newBalance: "Nouveau solde",

        // Return
        returnProduct: "Retour Produit",
        returnedProduct: "PRODUIT RETOURNÉ",
        quantity: "QUANTITÉ",
        returnReason: "MOTIF DU RETOUR",
        expired: "Périmé",
        damaged: "Endommagé",
        refused: "Refusé",
        errorLabel: "Erreur",
        other: "Autre",
        notes: "NOTES (optionnel)",
        additionalDetails: "Détails supplémentaires...",
        creditNote: "AVOIR À CRÉDITER",
        registerReturn: "Enregistrer le retour",
        confirmReturn: "Confirmer le retour",
        returnRegistered: "Retour enregistré",
        selectProduct: "Sélectionnez un produit",
        invalidQty: "Quantité invalide",

        // Dashboard
        daySummary: "Résumé du jour",
        financial: "FINANCIER",
        sales: "Ventes (DA)",
        collected: "Encaissé (DA)",
        returns: "Retours (DA)",
        net: "Net (DA)",
        distTours: "DISTANCE & TOURNÉES",
        kmDriven: "km parcourus",
        tour: "tournée",
        tours: "tournées",
        cashHandover: "BILAN DE CAISSE (A REMETTRE)",
        especes: "Espèces",
        cheques: "Chèques",
        virements: "Virements",
        completedDay: "Bravo ! Journée complète 🎉",
        donePercent: "complété",
        deliveredLbl: "Livrés",
        absentLbl: "Absents",
        remaining: "Restants",

        // Sync
        syncStatus: "ÉTAT DE SYNCHRONISATION",
        online: "En ligne",
        offline: "Hors ligne",
        pendingOps: "opération(s) en attente",
        lastSync: "Dernière synchro",
        forceSync: "Forcer la synchro",
        never: "Jamais",

        // Clients
        searchClient: "Rechercher un client...",
        noClientFound: "Aucun client trouvé",
        totalBalance: "Total solde",
        clientFile: "Fiche Client",
        newBLAction: "Nouveau BL",
        collectAction: "Encaisser",
        returnAction: "Retour",
        bls: "BLs",
        payments: "Paiements",
        returnsTab: "Retours",
        noBL: "Aucun BL",
        noReturn: "Aucun retour",
        paid: "Payé",
        inProgress: "En cours",

        // Settings
        gpsNavigation: "NAVIGATION GPS",
        navApp: "Application de navigation",
        googleMaps: "Google Maps",
        waze: "Waze",
        osm: "OSM",
        gpsSource: "Source GPS pour le tracking",
        gpsSourceDesc: "Choisissez entre le GPS de votre téléphone ou un tracker GPS externe dans le camion",
        phoneGPS: "GPS Téléphone",
        truckTracker: "Tracker Camion",
        general: "GÉNÉRAL",
        activeGPS: "Tracking GPS actif",
        sendPosition: "Envoyer votre position en temps réel",
        autoSync: "Synchronisation auto",
        autoSyncDesc: "Sync automatique en arrière-plan",
        language: "LANGUE",
        langLabel: "Langue de l'application",
        french: "Français",
        arabic: "العربية",
        info: "INFORMATIONS",
        server: "Serveur",
        version: "Version",
        tenant: "Tenant",
        logout: "Se déconnecter",
        logoutConfirm: "Êtes-vous sûr de vouloir vous déconnecter ?",
        disconnect: "Déconnecter",

        // TruckLoad
        truckLoadTitle: "Chargement Camion",
        truckLoaded: "Camion chargé",
        truckContent: "CONTENU DU CAMION",
        products: "produits",
        loaded: "Chargé",
        sold: "Vendu",
        returned: "Retourné",
        remainingLbl: "restant",
        loading: "CHARGEMENT",
        units: "unités",
        scanOrSearch: "Scannez ou recherchez des produits à charger",
        validateLoad: "Valider le chargement",
        confirmLoad: "Confirmer le chargement",
        loadTruck: "Charger le camion",
        truckLoadedSuccess: "Camion chargé",
        productsLoaded: "produits chargés",
        stockInsufficient: "Stock insuffisant",
        addProduct: "Ajoutez au moins un produit au chargement",
        available: "dispo",
        requested: "demandé",

        // Delivery proof
        takePhoto: "Prendre une photo",
        deliveryProof: "Preuve de livraison",
        photoTaken: "Photo prise",
        skipPhoto: "Passer",
        confirmDelivery: "Confirmer la livraison",

        // Barcode
        scanBarcode: "Scanner le code-barres",
        cameraAccess: "Accès caméra requis",
        cameraDesc: "Pour scanner les codes-barres des produits",
        allowCamera: "Autoriser la caméra",
        alignBarcode: "Alignez le code-barres dans le cadre",
        codeScanned: "Code scanné !",
        notFound: "Introuvable",
        noProductBarcode: "Aucun produit avec ce code.",
    },

    ar: {
        // Navigation
        myTour: "جولتي",
        clients: "العملاء",
        today: "اليوم",
        settings: "الإعدادات",

        // Login
        login: "تسجيل الدخول",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        loginError: "خطأ في الاتصال",
        fillAllFields: "يرجى ملء جميع الحقول",

        // Tour
        tourOfDay: "جولة اليوم",
        noTourToday: "لا توجد جولة اليوم",
        createFromWeb: "أنشئ جولة من لوحة التحكم",
        start: "ابدأ",
        close: "إغلاق",
        closeTour: "إغلاق الجولة",
        closeConfirm: "هل تريد حقاً إنهاء هذه الجولة؟",
        truckLoad: "تحميل الشاحنة",
        cancel: "إلغاء",
        error: "خطأ",

        // Stop status
        pending: "في الانتظار",
        enRoute: "في الطريق",
        delivered: "تم التسليم",
        absent: "غائب",
        skipped: "تم التخطي",
        partial: "جزئي",

        // Stop actions
        gps: "GPS",
        bl: "وصل",
        pay: "دفع",
        returnLabel: "إرجاع",
        balance: "الرصيد",
        call: "اتصال",
        whatsapp: "واتساب",

        // CreateBL
        newBL: "وصل تسليم جديد",
        searchProduct: "ابحث عن منتج...",
        cart: "السلة",
        article: "منتج",
        articles: "منتجات",
        payment: "الدفع",
        cash: "نقداً",
        check: "شيك",
        transfer: "تحويل",
        amountPaid: "المبلغ المدفوع (دج)",
        confirmBL: "تأكيد الوصل",
        validateBL: "تأكيد الوصل",
        totalTTC: "المجموع",
        blCreated: "تم إنشاء الوصل",
        print: "طباعة",
        share: "مشاركة",
        closeLbl: "إغلاق",

        // Payment
        collection: "تحصيل",
        paymentAmount: "مبلغ الدفع",
        paymentMethod: "طريقة الدفع",
        registerPayment: "تسجيل الدفع",
        paymentRegistered: "تم تسجيل الدفع",
        invalidAmount: "مبلغ غير صالح",
        confirmPayment: "تأكيد الدفع",
        oldBalance: "الرصيد القديم",
        newBalance: "الرصيد الجديد",

        // Return
        returnProduct: "إرجاع منتج",
        returnedProduct: "المنتج المرتجع",
        quantity: "الكمية",
        returnReason: "سبب الإرجاع",
        expired: "منتهي الصلاحية",
        damaged: "تالف",
        refused: "مرفوض",
        errorLabel: "خطأ",
        other: "أخرى",
        notes: "ملاحظات (اختياري)",
        additionalDetails: "تفاصيل إضافية...",
        creditNote: "مبلغ الائتمان",
        registerReturn: "تسجيل الإرجاع",
        confirmReturn: "تأكيد الإرجاع",
        returnRegistered: "تم تسجيل الإرجاع",
        selectProduct: "اختر منتجاً",
        invalidQty: "كمية غير صالحة",

        // Dashboard
        daySummary: "ملخص اليوم",
        financial: "مالي",
        sales: "المبيعات (دج)",
        collected: "المحصّل (دج)",
        returns: "المرتجعات (دج)",
        net: "الصافي (دج)",
        distTours: "المسافة والجولات",
        kmDriven: "كلم مقطوعة",
        tour: "جولة",
        tours: "جولات",
        cashHandover: "كشف الصندوق (للتسليم)",
        especes: "نقداً",
        cheques: "شيكات",
        virements: "تحويلات",
        completedDay: "أحسنت! يوم مكتمل 🎉",
        donePercent: "مكتمل",
        deliveredLbl: "تم تسليمهم",
        absentLbl: "غائبون",
        remaining: "متبقون",

        // Sync
        syncStatus: "حالة المزامنة",
        online: "متصل",
        offline: "غير متصل",
        pendingOps: "عملية/عمليات معلقة",
        lastSync: "آخر مزامنة",
        forceSync: "مزامنة يدوية",
        never: "أبداً",

        // Clients
        searchClient: "ابحث عن عميل...",
        noClientFound: "لم يتم العثور على عملاء",
        totalBalance: "إجمالي الرصيد",
        clientFile: "ملف العميل",
        newBLAction: "وصل جديد",
        collectAction: "تحصيل",
        returnAction: "إرجاع",
        bls: "الوصولات",
        payments: "المدفوعات",
        returnsTab: "المرتجعات",
        noBL: "لا يوجد وصل",
        noReturn: "لا يوجد إرجاع",
        paid: "مدفوع",
        inProgress: "قيد التنفيذ",

        // Settings
        gpsNavigation: "ملاحة GPS",
        navApp: "تطبيق الملاحة",
        googleMaps: "خرائط جوجل",
        waze: "ويز",
        osm: "OSM",
        gpsSource: "مصدر GPS للتتبع",
        gpsSourceDesc: "اختر بين GPS الهاتف أو جهاز تتبع خارجي في الشاحنة",
        phoneGPS: "GPS الهاتف",
        truckTracker: "متتبع الشاحنة",
        general: "عام",
        activeGPS: "تتبع GPS نشط",
        sendPosition: "إرسال موقعك في الوقت الحقيقي",
        autoSync: "مزامنة تلقائية",
        autoSyncDesc: "المزامنة التلقائية في الخلفية",
        language: "اللغة",
        langLabel: "لغة التطبيق",
        french: "Français",
        arabic: "العربية",
        info: "معلومات",
        server: "الخادم",
        version: "الإصدار",
        tenant: "المستأجر",
        logout: "تسجيل الخروج",
        logoutConfirm: "هل أنت متأكد أنك تريد تسجيل الخروج؟",
        disconnect: "خروج",

        // TruckLoad
        truckLoadTitle: "تحميل الشاحنة",
        truckLoaded: "تم تحميل الشاحنة",
        truckContent: "محتوى الشاحنة",
        products: "منتجات",
        loaded: "محمّل",
        sold: "مباع",
        returned: "مرتجع",
        remainingLbl: "متبقي",
        loading: "التحميل",
        units: "وحدات",
        scanOrSearch: "امسح أو ابحث عن منتجات للتحميل",
        validateLoad: "تأكيد التحميل",
        confirmLoad: "تأكيد التحميل",
        loadTruck: "تحميل الشاحنة",
        truckLoadedSuccess: "تم تحميل الشاحنة",
        productsLoaded: "منتجات محمّلة",
        stockInsufficient: "المخزون غير كافٍ",
        addProduct: "أضف منتجاً واحداً على الأقل",
        available: "متوفر",
        requested: "مطلوب",

        // Delivery proof
        takePhoto: "التقاط صورة",
        deliveryProof: "إثبات التسليم",
        photoTaken: "تم التقاط الصورة",
        skipPhoto: "تخطي",
        confirmDelivery: "تأكيد التسليم",

        // Barcode
        scanBarcode: "مسح الباركود",
        cameraAccess: "مطلوب الوصول للكاميرا",
        cameraDesc: "لمسح الباركود الخاص بالمنتجات",
        allowCamera: "السماح بالكاميرا",
        alignBarcode: "ضع الباركود داخل الإطار",
        codeScanned: "تم المسح!",
        notFound: "غير موجود",
        noProductBarcode: "لا يوجد منتج بهذا الرمز.",
    },
} as const;

type TranslationKeys = keyof typeof translations.fr;

interface LangState {
    lang: Lang;
    isRTL: boolean;
    t: (key: TranslationKeys) => string;
    setLang: (lang: Lang) => Promise<void>;
    loadLang: () => Promise<void>;
}

export const useLangStore = create<LangState>((set, get) => ({
    lang: "fr",
    isRTL: false,

    t: (key: TranslationKeys) => {
        const { lang } = get();
        return translations[lang][key] || translations.fr[key] || key;
    },

    setLang: async (lang: Lang) => {
        const isRTL = lang === "ar";
        I18nManager.forceRTL(isRTL);
        I18nManager.allowRTL(isRTL);
        await AsyncStorage.setItem("setting_language", lang);
        set({ lang, isRTL });
    },

    loadLang: async () => {
        try {
            const saved = await AsyncStorage.getItem("setting_language");
            if (saved === "ar" || saved === "fr") {
                const isRTL = saved === "ar";
                I18nManager.forceRTL(isRTL);
                I18nManager.allowRTL(isRTL);
                set({ lang: saved, isRTL });
            }
        } catch { /* silent */ }
    },
}));
