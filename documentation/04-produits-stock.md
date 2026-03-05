# 4. Produits & Stock

La gestion centralisée de tout votre catalogue commercial et de votre inventaire physique.

## 4.1. Liste des Produits (`/products`)
Le catalogue principal de votre entreprise.

**Filtres et Vues :**
- **Barre de recherche** : Nom, SKU, Code-barres.
- **Vue Tableau / Grille** : Liste compacte ou cartes avec photos.
- **Filtres** : Par Catégorie, Marque, En rupture de stock, Alerte de stock.
- **Export** : En Excel ou PDF de la liste filtrée.
- **Import** : Bouton d'importation massive via fichier Excel (Modèle `.xlsx` fourni).

## 4.2. Création / Édition d'un Produit (Formulaire Produit)
C'est ici que toutes les informations d'un article sont saisies.

**Champs disponibles (Onglets) :**

### Informations Générales
- **Type de Produit** : Standard (Physique), Service (Ex: Réparation), ou Pack (Combo de plusieurs articles).
- **Nom du Produit (FR, EN, AR)** : Titre affiché.
- **Catégorie & Sous-Catégorie** : Listes déroulantes de classification.
- **Marque** : Liste déroulante des fabricants.
- **SKU (Stock Keeping Unit)** : Identifiant unique interne.
- **Code-barres Principal (EAN-13, UPC)** : Scanné au POS.
- **Générer Code-barres** : Bouton pour créer un code aléatoire si le produit n'en a pas.
- **Description** : Texte libre pour détails.
- **Image Produit** : Upload d'une image (optimisée en 300x300, format WebP automatique).

### Prix & Taxes
- **Coût d'Achat (Prix d'achat hors taxe)** : Prix payé au fournisseur.
- **Coût M.P (Prix Moyen Pondéré)** : Calculé automatiquement selon l'historique d'achat.
- **Taxe (TVA applicable)** : Par exemple : 9%, 19%, exonéré. Format algérien.
- **Structure des 3 Niveaux de Prix (TTC ou HT selon config) :**
  - **Prix de Vente Détail** : Prix public standard.
  - **Prix de Gros** : Prix pour clients B2B ou quantités.
  - **Prix Revendeur (Super Gros)** : Prix spécial.
- **Marge Automatique (%)** : Le système affiche la marge bénéficiaire selon le coût d'achat et le prix de vente.

### Gestion du Stock (Inventaire)
- **Activer la gestion de stock** : Oui / Non (utile pour désactiver l'inventaire des services).
- **Stock Actuel (Par Magasin)** : Quantité théorique en rayon.
- **Seuil d'Alerte (Stock Minimum)** : Si le stock descend sous cette valeur, alerte sur le Dashboard.
- **Unité de Mesure** : U, Kg, Litre, Mètre, Boîte, etc.

### Extra & Variantes
- **Multi-Codes Barres** : Ajouter des codes supplémentaires (ex: un code pour l'unité, un pour le pack de 6, qui déduira 6 unités du stock).
- **Date de Péremption (Expiration)** : Associer un lot à une date pour alertes de péremption imminente alimentaire/pharmacie.
- **Actif / Inactif** : Bouton/Toggle pour masquer un produit du POS sans le supprimer.

## 4.3. Marques (`/brands`) & Catégories (`/categories`)
- **Création Simple** : Nom (multilingue) et Description/Image.
- **Action Rapide** : Création "à la volée" depuis le formulaire Produit sans quitter la page.

## 4.4. Générateur d'Étiquettes Code-barres (`/barcode`)
Module d'impression pour le rayonnage.
- **Sélection des Produits** : Choix des produits à étiqueter et de la quantité d'étiquettes.
- **Format d'étiquette** : Standard, Petit, Format A4 avec X étiquettes par page (ex: 40/page).
- **Informations affichées** : Nom du produit, Prix, Code-barres (Code 128 par défaut).

## 4.5. Gestion des Avaries et Pertes (`/avaries`)
Démarquer un produit (vol, casse, date expirée) sans qu'il ne rentre dans les ventes.
- **Action** : Sélection produit -> Magasin -> Quantité perdue -> Motif (Casse, Vol, Expiré) -> Validation.
- **Impact** : Déduit le stock, ajuste la valeur du stock, comptabilisé comme dépense "Perte".

## 4.6. Transferts Inter-Magasins (`/inventory/transfers`)
Déplacer la marchandise du dépôt principal vers un point de vente, ou entre deux points de vente.
- **Émetteur -> Récepteur** : Magasin A vers Magasin B.
- **Liste de Colisage** : Sélection des produits et quantités.
- **Statuts** : Expédié (Stock déduit de A, en transit), Réceptionné (Stock ajouté à B). Un bordereau de transfert PDF est généré.

## 4.7. Audit d'Inventaire (Comptage Physique) (`/inventory-audit`)
Mettre à jour le stock "Théorique" logiciel avec le stock "Physique" réel.
- **Création d'une session d'audit** : Sélection du magasin et catégorie (ou complet).
- **Saisie du comptage** : Le gérant compte au rayon et scanne (ou tape) chaque produit et sa vraie quantité (Ex: Le logiciel indique 10, le magasin en a 8).
- **Validation** : Le système génère un "Ajustement d'Inventaire" (Perte de 2) et met la nouvelle valeur théorique à 8 avec historisation horodatée.

## 4.8. Suggestions de Réapprovisionnement (`/reorder`)
Module intelligent.
- **Algorithme** : Analyse les ventes passées, les seuils d'alerte, et le stock actuel.
- **Résultat** : Génère une liste de produits à commander avec les "Quantités Manquantes" conseillées.
- **Action** : Transforme d'un clic ces suggestions en Bon de Commande Fournisseur.
