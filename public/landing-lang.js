const APP_URL = '/fr/register';
const WA = 'https://wa.me/213696928227';

const T = {
  fr: {
    nav_features: 'Fonctionnalités', nav_usecases: "Cas d'usage", nav_pricing: 'Tarifs', nav_contact: 'Contact', nav_cta: 'Essai Gratuit',
    hero_badge: '🇩🇿 Logiciel de Caisse Algérien N°1',
    hero_h1a: 'Gérez votre commerce avec', hero_h1b: 'intelligence',
    hero_desc: "SyncloudPOS est le logiciel tout-en-un pour les commerces algériens — superettes, boutiques, grossistes, pharmacies. Gérez ventes, stock, clients et finances depuis n'importe quel appareil.",
    hero_cta1: '🚀 Essai Gratuit 7 Jours', hero_cta2: 'Voir les fonctionnalités ↓',
    stat1: 'Fonctionnalités', stat2: 'Cloud & Local', stat3: 'Langues FR/AR/EN', stat4: 'Support 7j/7',
    fb1: 'Vente enregistrée', fb2: 'Stock mis à jour', fb3: 'IA active',
    trust_label: 'Conçu pour les commerces algériens :', t1: 'Superettes', t2: 'Grossistes', t3: 'Boutiques', t4: 'Pharmacies', t5: 'Quincailleries', t6: 'Restaurants',
    sec_feat_tag: 'Fonctionnalités', sec_feat_title: 'Toutes les fonctionnalités, une par une', sec_feat_desc: 'Une solution complète conçue pour chaque besoin de votre commerce.',
    cat1_title: 'Caisse & Ventes (POS)', cat1_desc: 'Tout pour encaisser rapidement et gérer vos ventes.',
    cat1_items: [
      { icon: '🛒', title: 'Interface POS Rapide', desc: 'Encaissement ultra-rapide avec scan barcode, recherche produit, raccourcis clavier.' },
      { icon: '🔖', title: 'Paiement Partiel / Crédit', desc: 'Paiement en plusieurs fois, suivi des crédits et relances.' },
      { icon: '🧾', title: 'Reçu Thermique', desc: 'Impression ticket personnalisé avec logo, TVA, pied de page.' },
      { icon: '📱', title: 'Envoi Reçu WhatsApp', desc: 'Partagez le ticket de caisse directement via WhatsApp au client.' },
      { icon: '👤', title: 'Sélection Client en Caisse', desc: 'Associez un client à chaque vente pour suivi crédit et historique.' },
      { icon: '💵', title: 'Multi-Modes de Paiement', desc: 'Espèces, carte, virement, crédit. Combinaison libre.' },
      { icon: '🔁', title: 'Retours & Remboursements', desc: 'Gestion des retours avec remise en stock automatique.' },
      { icon: '📋', title: 'Bon de Commande (BDC)', desc: 'Créez des bons de commande avant facturation finale.' },
      { icon: '🏷️', title: 'Promotions & Remises', desc: 'Créez des promotions (% ou montant fixe) avec dates de validité. Remises par produit, client ou globale.' },
      { icon: '📅', title: 'Factures Récurrentes', desc: 'Factures automatiques mensuelles ou périodiques pour les clients réguliers.' },
      { icon: '📦', title: 'Réservation avec Acompte', desc: 'Réservez des produits avec versement d\'un acompte par le client.' },
      { icon: '🌙', title: 'Clôture de Journée', desc: 'Récapitulatif quotidien : ventes, bénéfices, crédits, dépenses. Export complet.' },
    ],
    cat2_title: 'Produits & Stock', cat2_desc: 'Gérez votre catalogue et inventaire avec précision.',
    cat2_items: [
      { icon: '📦', title: 'Catalogue Produits Complet', desc: 'Photos 300x300, catégories, marques, descriptions, codes-barres multiples.' },
      { icon: '🔢', title: 'Multi-Barcode par Produit', desc: "Plusieurs codes-barres pour un même article (pack, unité, etc.)." },
      { icon: '💰', title: '3 Niveaux de Prix', desc: 'Prix détail, gros et revendeur par produit.' },
      { icon: '📉', title: 'Stock Minimum & Alertes', desc: 'Seuils automatiques et alertes de rupture de stock.' },
      { icon: '📊', title: 'Historique Mouvements Stock', desc: 'Traçabilité complète : entrées, sorties, ajustements, transferts.' },
      { icon: '📥', title: 'Import Excel', desc: 'Importez produits, clients, fournisseurs depuis Excel en secondes.' },
      { icon: '🗑️', title: 'Avaries & Pertes', desc: 'Enregistrez produits expirés ou avariés. Stock ajusté automatiquement.' },
      { icon: '📅', title: 'Dates de Péremption', desc: 'Suivi des dates pour produits alimentaires et pharmaceutiques.' },
      { icon: '📋', title: 'Inventaire Annuel', desc: "Rapport d'inventaire global conforme aux exigences fiscales." },
      { icon: '📃', title: 'Liste de Prix', desc: 'Générez des listes de prix filtrées par catégorie et type de client (détail/gros/revendeur).' },
      { icon: '🔍', title: 'Audit d\'Inventaire', desc: 'Comptage physique avec correction automatique des écarts de stock.' },
      { icon: '🔄', title: 'Suggestions de Réapprovisionnement', desc: 'Le système calcule automatiquement les quantités à commander selon vos ventes.' },
      { icon: '🏷️', title: 'Génération de Codes-Barres', desc: 'Créez et imprimez vos propres étiquettes codes-barres.' },
    ],
    cat3_title: 'Clients & Fournisseurs', cat3_desc: 'Gérez vos relations commerciales, crédits, emprunts et dettes.',
    cat3_items: [
      { icon: '👥', title: 'Fiches Clients Complètes', desc: 'NIF, NIS, NRC, RIB, adresse, téléphone, email.' },
      { icon: '💳', title: 'Suivi des Dettes Clients', desc: 'Solde impayé, historique paiements, rappels.' },
      { icon: '🏦', title: 'Emprunts Clients', desc: 'Gérez les prêts accordés aux clients : montant, échéances, remboursements et suivi.' },
      { icon: '📈', title: 'Historique Achats Client', desc: 'Tous les achats par client avec détails et dates.' },
      { icon: '🏭', title: 'Gestion Fournisseurs', desc: 'Fiches fournisseurs avec infos fiscales algériennes.' },
      { icon: '📄', title: "Bons d'Achat Fournisseurs", desc: 'Commandes, réceptions, paiements et avances.' },
      { icon: '💸', title: 'Paiements Fournisseurs', desc: 'Suivi des paiements, avances et soldes restants.' },
      { icon: '🏧', title: 'Emprunts Fournisseurs', desc: 'Suivi des emprunts auprès des fournisseurs : montant, conditions, remboursements.' },
      { icon: '🔄', title: 'Transferts Inter-Magasins', desc: 'Transférez du stock entre vos différents points de vente.' },
      { icon: '💰', title: 'Commissions & Suivi', desc: 'Gérez les commissions par vendeur, agent ou apporteur d\'affaires.' },
    ],
    cat4_title: 'Finance & Trésorerie', cat4_desc: 'Contrôlez vos flux financiers, dépenses et trésorerie en temps réel.',
    cat4_items: [
      { icon: '💰', title: 'Multi-Caisses', desc: 'Plusieurs caisses liées à différents points de vente.' },
      { icon: '🏦', title: 'Comptes Bancaires', desc: 'Suivez soldes et mouvements de vos comptes bancaires.' },
      { icon: '🔄', title: 'Virements Internes', desc: 'Transferts entre caisses et comptes en un clic.' },
      { icon: '💸', title: 'Gestion des Dépenses', desc: 'Catégorisez dépenses (loyer, salaires, électricité...) liées à la trésorerie.' },
      { icon: '📊', title: 'Vue Trésorerie Globale', desc: 'Soldes de toutes les caisses et comptes en temps réel.' },
      { icon: '🧾', title: 'Historique Transactions', desc: 'Chaque mouvement financier est tracé et consultable.' },
      { icon: '📒', title: 'Grand Livre (Ledger)', desc: 'Journal comptable complet de toutes les opérations financières.' },
      { icon: '🏦', title: 'Emprunts & Remboursements', desc: 'Suivi des emprunts clients et fournisseurs avec échéances et remboursements.' },
    ],
    cat5_title: 'Rapports & Analytiques', cat5_desc: 'Prenez de meilleures décisions grâce à des données claires et visuelles.',
    cat5_items: [
      { icon: '📊', title: 'Dashboard Temps Réel', desc: "CA, bénéfice net, COGS, marges en un coup d'œil." },
      { icon: '📈', title: 'Évolution des Ventes', desc: "Graphiques d'évolution par jour, semaine, mois." },
      { icon: '🏆', title: 'Top Produits', desc: 'Classement de vos meilleurs produits par ventes et bénéfices.' },
      { icon: '👥', title: 'Rapports par Client', desc: 'Ventes, crédits et historique détaillé par client.' },
      { icon: '📉', title: 'Rapports Financiers', desc: 'Revenus, dépenses, bénéfice brut et net.' },
      { icon: '🛒', title: 'Rapports Ventes', desc: 'Détail complet de chaque vente avec filtres période, vendeur, magasin.' },
      { icon: '📦', title: 'Rapports Achats', desc: 'Analyse des achats par fournisseur, période et produit.' },
      { icon: '📋', title: 'Rapports Inventaire', desc: 'État du stock, valeur du stock, produits en rupture.' },
      { icon: '💰', title: 'Rapports Trésorerie', desc: 'Flux de caisse, historique des mouvements, soldes par caisse.' },
      { icon: '🌙', title: 'Clôture de Journée', desc: 'Rapport de fin de journée avec synthèse complète des opérations.' },
      { icon: '🖨️', title: 'Export PDF & Impression', desc: 'Exportez tous vos rapports en PDF ou imprimez-les.' },
    ],
    cat6_title: 'Intelligence Artificielle', cat6_desc: 'Des outils IA pour automatiser et booster votre commerce.',
    cat6_items: [
      { icon: '🤖', title: 'Chat IA Intégré', desc: 'Posez des questions sur vos données en langage naturel. Support multi-fournisseurs (OpenAI, Gemini, Claude).' },
      { icon: '📸', title: 'OCR Factures', desc: "Scannez vos factures d'achat et importez les données automatiquement." },
      { icon: '📈', title: 'Prévisions de Ventes (AI Forecast)', desc: "L'IA prédit vos ventes futures pour mieux planifier vos achats." },
      { icon: '💡', title: 'Suggestions Intelligentes', desc: "L'IA recommande des actions basées sur vos données de vente et stock." },
      { icon: '🔔', title: 'Alertes Intelligentes', desc: 'Notifications automatiques : stock bas, crédits impayés, objectifs atteints.' },
    ],
    cat7_title: 'Système & Administration', cat7_desc: 'Configuration avancée, sécurité, intégrations et multi-utilisateurs.',
    cat7_items: [
      { icon: '🔒', title: 'Permissions Vendeurs', desc: 'Comptes vendeurs avec droits granulaires : lecture seule, modification, suppression.' },
      { icon: '🏪', title: 'Multi-Magasins', desc: 'Gérez plusieurs points de vente depuis un seul compte avec stocks séparés.' },
      { icon: '🌍', title: 'Multi-Langues (FR/AR/EN)', desc: 'Interface en Français, Arabe et Anglais. Changez à tout moment.' },
      { icon: '⚙️', title: 'Paramètres Personnalisés', desc: 'Logo, infos commerciales, format reçu, thème sombre/clair et plus.' },
      { icon: '📱', title: 'Responsive (PC/Tablette/Mobile)', desc: "Utilisez SyncloudPOS depuis n'importe quel appareil." },
      { icon: '☁️', title: 'Cloud & Local', desc: 'Fonctionne en ligne et hors-ligne avec synchronisation automatique.' },
      { icon: '💾', title: 'Sauvegarde & Restauration', desc: 'Sauvegardez vos données et restaurez-les en cas de besoin.' },
      { icon: '📲', title: 'Intégration WhatsApp', desc: 'Envoyez reçus, factures et relances directement via WhatsApp. Configuration dans les paramètres.' },
      { icon: '🚚', title: 'Intégration Livraison', desc: 'Connectez DHD, HDD, Yalidine et autres services de livraison algériens.' },
      { icon: '🔐', title: 'Vérification OTP', desc: 'Sécurisez votre compte avec vérification par code OTP.' },
      { icon: '🌙', title: 'Mode Ramadan', desc: 'Horaires et paramètres adaptés au mois de Ramadan.' },
      { icon: '📝', title: 'Formation Intégrée', desc: 'Guides étape par étape pour maîtriser le logiciel en quelques minutes.' },
    ],
    cat8_title: 'Conformité Algérienne', cat8_desc: 'Adapté aux exigences fiscales et commerciales algériennes.',
    cat8_items: [
      { icon: '🇩🇿', title: 'NIF / NIS / NRC / RIB', desc: 'Champs fiscaux algériens intégrés pour clients et fournisseurs.' },
      { icon: '🧾', title: 'Reçu Conforme', desc: 'Tickets de caisse conformes à la réglementation algérienne.' },
      { icon: '📋', title: 'Inventaire Annuel Légal', desc: "Rapport d'inventaire conforme aux obligations fiscales." },
      { icon: '💱', title: 'Devise DZD', desc: 'Tarification en Dinar Algérien avec formatage local.' },
      { icon: '📊', title: 'Déclaration G12', desc: 'Génération automatique de la déclaration fiscale G12 (TVA mensuelle).' },
      { icon: '📄', title: 'Déclaration G50', desc: 'Génération automatique de la déclaration fiscale G50 (IBS/TAP/TVA).' },
      { icon: '🚚', title: 'Livraison Locale', desc: 'Intégration avec les services de livraison algériens (DHD, HDD, Yalidine).' },
    ],
    sec_uc_tag: "Cas d'utilisation", sec_uc_title: "À qui s'adresse SyncloudPOS ?", sec_uc_desc: 'Une solution flexible pour tous les secteurs du commerce en Algérie.',
    uc_items: [
      {
        icon: '🛒', title: 'Superettes & Alimentation', desc: 'Encaissement ultra-rapide avec scan barcode. Dates péremption, avaries, tickets.',
        list: ["Scan centaines d'articles/heure", "Gestion avaries & périmés", "Tickets thermiques automatiques", "Alertes stock minimum"]
      },
      {
        icon: '🏭', title: 'Grossistes & Distributeurs', desc: 'Multi-tarifs (Gros, Revendeur, Détail). Suivi crédits clients.',
        list: ['Prix de gros / détail / revendeur', 'Bons de livraison intégrés', 'Crédits & paiements partiels', 'Rapports par client']
      },
      {
        icon: '👕', title: 'Boutiques & Commerce', desc: 'Analyse meilleures ventes, retours clients, suivi CA quotidien.',
        list: ['Import catalogue Excel', 'Photos produits HD', 'Statistiques quotidiennes', 'Gestion retours & remises']
      },
      {
        icon: '💊', title: 'Pharmacies & Librairies', desc: 'Recherche rapide parmi des milliers de références. Stock minimum.',
        list: ['Recherche instantanée', 'Alertes rupture de stock', 'NIF/NIS fournisseurs', 'Historique des achats']
      },
    ],
    sec_how_tag: 'Comment ça marche', sec_how_title: 'Opérationnel en 4 étapes', sec_how_desc: 'Pas besoin de technicien. Configuration rapide.',
    st1: 'Inscrivez-vous', st1d: 'Créez votre compte gratuitement. Configuration en 5 minutes.',
    st2: 'Ajoutez vos données', st2d: 'Importez produits, clients et fournisseurs depuis Excel.',
    st3: 'Commencez à vendre', st3d: 'Utilisez la caisse POS depuis ordinateur, tablette ou téléphone.',
    st4: 'Suivez vos résultats', st4d: 'Dashboard temps réel: CA, bénéfices, stock, clients.',
    sec_testi_tag: 'Success Story', sec_testi_title: 'Ils font confiance à SyncloudPOS',
    testi_quote: "« Avant SyncloudPOS, je perdais des heures chaque soir à calculer ma caisse. Aujourd'hui je gère ma superette et mon dépôt depuis mon téléphone. Le suivi des crédits m'a fait récupérer plus de 400 000 DA de dettes oubliées. »",
    testi_name: 'Ahmed B.', testi_role: 'Propriétaire – 2 Superettes + 1 Dépôt, Alger',
    sec_price_tag: 'Tarifs', sec_price_title: 'Plans adaptés à votre commerce', sec_price_desc: 'Toutes les fonctionnalités incluses. Tarification transparente.',
    p1_name: 'Starter', p1_price: 'Sur mesure', p1_sub: 'Devis via WhatsApp', p1_btn: 'Demander un devis',
    p1_feats: ['1 magasin', 'Caisse POS illimitée', 'Produits & Stock', 'Clients & Fournisseurs', 'Rapports de base', 'Support WhatsApp'],
    p2_name: 'Pro', p2_price: 'Sur mesure', p2_sub: 'Devis via WhatsApp', p2_btn: "Démarrer l'essai gratuit", recommended: '⭐ Recommandé',
    p2_feats: ['Multi-magasins', 'Toutes les fonctionnalités', 'Import Excel', 'Permissions vendeurs', 'Analytics avancés', 'IA intégrée', 'Support prioritaire'],
    trial_pill: 'Offre Spéciale', trial_h2a: "7 jours d'essai", trial_h2b: '100% gratuits',
    trial_desc: 'Testez toutes les fonctionnalités sans engagement. Aucune carte bancaire requise.',
    trial_c1: 'Sans engagement', trial_c2: 'Accès complet', trial_c3: 'Support inclus',
    trial_btn1: '🚀 Démarrer maintenant', trial_btn2: '📲 WhatsApp',
    sec_cont_tag: 'Contact', sec_cont_title: 'Parlons de votre commerce', sec_cont_desc: "Disponible 7j/7 sur WhatsApp. De l'installation à la formation.",
    ci_avail: 'Disponibilité', ci_location: 'Localisation', ci_location_val: 'Algérie – Service national',
    ci_btn1: "🚀 Démarrer l'essai gratuit", ci_btn2: '📲 Commander sur WhatsApp',
    form_title: 'Message rapide', f_name: 'Votre nom', f_phone: 'Numéro WhatsApp', f_type: 'Type de commerce', f_msg: 'Votre message',
    f_ph_name: 'Ex: Ahmed Bensalem', f_ph_phone: '+213 6XX XX XX XX', f_ph_msg: 'Je voudrais tester SyncloudPOS...',
    f_opts: ['Sélectionnez...', 'Épicerie / Alimentation', 'Commerce de gros', 'Boutique vêtements', 'Pharmacie', 'Matériaux construction', 'Électronique', 'Autre'],
    f_send: '📲 Envoyer via WhatsApp',
    footer_desc: 'SyncloudPOS — le logiciel de caisse intelligent conçu pour les commerces algériens.',
    fl1: 'Fonctionnalités', fl2: 'Support', fl3: 'Langues',
    fl_f: ['Caisse POS', 'Gestion stock', 'Clients & Crédits', 'Import Excel', 'Multi-magasins', 'Formation'],
    fl_s: ['WhatsApp Support', 'Nous contacter', 'Essai gratuit', 'Formation'],
    copyright: '© 2026 SyncloudPOS. Fait avec ❤️ en 🇩🇿 Algérie'
  },


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
function t(k) { return (T[currentLang] && T[currentLang][k]) || T['fr'][k] || ''; }
function render() {
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-th]').forEach(el => { el.innerHTML = t(el.dataset.th); });
  document.querySelectorAll('[data-tp]').forEach(el => { el.placeholder = t(el.dataset.tp); });
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
  else msg += "\nJe voudrais plus d'informations.";
  window.open(WA + '?text=' + encodeURIComponent(msg), '_blank');
}
function goTrial() { window.location.href = APP_URL; }
