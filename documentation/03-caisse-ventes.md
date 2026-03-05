# 3. Caisse & Ventes (POS)

L'interface de Point de Vente (POS) est le cœur logiciel conçu pour des encaissements rapides et fluides, avec ou sans écran tactile.

## 3.1. Interface de Caisse Principale (`/pos`)
Une interface plein écran optimisée pour la vitesse.

### 3.1.1. Recherche et Ajout de Produits
- **Barre de recherche** : Saisie par nom, code-barres, ou SKU.
- **Grille des catégories** : Filtre rapide des produits par catégorie visuelle (icônes/couleurs).
- **Grille des produits** : Affiche les articles de la catégorie sélectionnée (Image, Nom, Prix, Stock disponible). Un clic ajoute l'article au panier.
- **Support Douchette (Lecteur Code-barres)** : Scan direct pour ajouter au panier instantanément. Supporte les multi-barcodes.
- **Scanner d'étiquettes de pesée** : Pour les balances (ex: viande, fromage), le système extrait le poids et le prix directement du code-barres généré par la balance.

### 3.1.2. Le Panier de Vente (Ticket en cours)
- **Liste des articles** : Nom du produit, Quantité, Prix unitaire, Total ligne.
- **Modifications sur la ligne** :
  - **Quantité** : Boutons `+` / `-` ou saisie manuelle.
  - **Prix unitaire** : Modifiable (si permission vendeur active).
  - **Bouton Supprimer (Corbeille)** : Retire la ligne du panier.
- **Résumé du Ticket** :
  - **Sous-total** : Somme hors remises.
  - **TVA** : Calcul automatique selon taux du produit.
  - **Total TTC** : Montant final à payer.

### 3.1.3. Informations Complémentaires et Remises
- **Sélection du Client** : Menu déroulant pour associer un client existant (pour crédit ou historique) ou bouton `+` pour créer un nouveau client rapide (Nom, Tél). Si « Client Divers » est laissé, c'est une vente au comptoir anonyme.
- **Bouton "Remise Globale"** : Appliquer un pourcentage (%) ou un montant fixe (DA) sur le total du ticket.
- **Bilan / Ticket en attente** : Possibilité de mettre un chariot en attente ("Hold") pour encaisser un autre client, puis de le rappeler plus tard.

## 3.2. Paiement et Encaissement (Modal de Paiement)
Ouvert lors du clic sur le bouton "Payer" ou "Encaisser".

**Champs et options disponibles :**
- **Montant Reçu** : Le montant donné par le client.
- **Monnaie à Rendre (*Change*)** : Calcul automatique (Montant Reçu - Total).
- **Multi-Modes de Paiement** :
  - **Espèces** : Par défaut.
  - **Carte Bancaire (CIB/Edahabia)** : Terminal de paiement.
  - **Virement B. / Chèque**.
  - **Crédit (Impayé)** : Le reste à payer est ajouté à la dette du client sélectionné.
- **Combinaison** : Ex: 50% espèces, 50% carte.
- **Bouton "Valider la Vente"** : Imprime/Sauvegarde le ticket et vide le panier.

## 3.3. Reçus et Factures (`/sales`)
Gestion des transactions historiques.

**Champs et options disponibles :**
- **Liste des ventes** : Tableau historique de toutes les ventes du magasin.
- **Bouton "Voir" (Détail)** : Ouvre un volet avec le contenu exact du ticket, l'heure, le vendeur.
- **Actions post-vente** :
  - **Ré-imprimer le ticket** (Thermique 58mm/80mm).
  - **Imprimer Facture A4** (Facture classique avec informations fiscales NIF/NIS).
  - **Envoyer via WhatsApp** : Envoie un lien ou un PDF du reçu directement au numéro du client en un clic.
  - **Bon de Livraison (BL)** : Impression du BL associé à la vente.
  - **Retour / Remboursement** : Créer un ticket de retour total ou partiel. Sélection des articles remboursés, réintégration automatique en stock et déduction du CA/Trésorerie.

## 3.4. Bons de Commande (BDC)
Pour les clients B2B ou les gros achats avant facturation finale.

**Champs et options disponibles :**
- Création d'un BDC similaire à l'interface POS mais avec validation en "Devis/Commande".
- **Statut** : En attente, Confirmé, Livré, Annulé.
- **Conversion** : Un BDC validé peut être transformé en Vente effective (Facture) en un clic.

## 3.5. Réservations avec Acompte (`/reservations`)
Permet de mettre de côté un produit avec dépôt préalable.

**Champs et options disponibles :**
- **Client & Date de retrait** : Infos obligatoires.
- **Liste des produits** : Articles réservés.
- **Montant Total** & **Acompte versé** : L'acompte entre en trésorerie immédiatement.
- **Reste à payer** : Sera encaissé le jour du retrait.
- **Statut** : En cours, Retirée, Annulée (avec conditions de remboursement).
