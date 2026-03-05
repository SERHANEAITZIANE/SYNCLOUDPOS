# 2. Tableau de Bord (Dashboard)

Le tableau de bord est le centre de contrôle de votre activité. Il fournit une vue d'ensemble en temps réel des performances de votre magasin (ou de tous les magasins si vous êtes administrateur global).

## 2.1. Vue Générale (Overview)
La page principale à l'ouverture du logiciel, donnant les KPIs (Indicateurs Clés de Performance) essentiels.

**Indicateurs (Cartes de résumé) :**
- **Chiffre d'affaires (CA) du jour** : Montant total des ventes de la journée (comparaison avec hier en pourcentage).
- **Bénéfice Net du jour** : CA brut - Coût des marchandises vendues (COGS).
- **Ventes du jour** : Nombre total de transactions/tickets générés.
- **Alertes de Stock Faible** : Nombre de produits ayant atteint ou dépassé leur seuil minimal d'alerte.

**Graphiques et Tableaux :**
- **Graphique d'évolution des ventes** : Courbe ou barres montrant le CA ou le nombre de ventes sur les 7 derniers jours ou par mois.
- **Top 5 des Produits Vendus** : Liste des articles générant le plus de chiffre d'affaires.
- **Dernières Transactions** : Tableau récapitulatif des X dernières ventes (Heure, Client, Montant, Statut).

## 2.2. Page des Rapports Complets (`/reports`)
Cette section regroupe tous les rapports analytiques détaillés du système.

### 2.2.1. Rapport des Ventes
- **Filtres** : Période (Aujourd'hui, Cette semaine, Ce mois, Personnalisé), Magasin, Vendeur, Client.
- **Données affichées** : Liste détaillée de chaque ticket de caisse (Numéro, Date, Client, Total Brut, Remises, Total Net, Marge).
- **Export** : Boutons pour exporter en Excel, CSV, ou imprimer en PDF.

### 2.2.2. Rapport des Achats
- **Filtres** : Période, Fournisseur, Magasin.
- **Données affichées** : Dons de réception, retours fournisseurs, coûts d'acquisition.

### 2.2.3. Rapport d'Inventaire
- **Données affichées** : Valeur totale du stock actuel (Prix d'achat net), Valeur potentielle de vente.
- **Filtres** : Par catégorie, par marque, produits en rupture, produits sur-stockés.
- **Fonctions** : Historique des mouvements (Entrées, Sorties, Ajustements).

### 2.2.4. Rapport de Trésorerie
- **Données affichées** : Flux de trésorerie entrant (Ventes, Paiements crédits clients) et sortant (Achats, Dépenses courantes).
- **Solde global** : État combiné de toutes les caisses et comptes bancaires.

### 2.2.5. Rapport par Utilisateur / Vendeur
- **Données affichées** : CA généré par chaque vendeur, nombre de ventes, remises accordées. Utile pour le calcul des commissions.

### 2.2.6. Rapports Fiscaux
- **G12 (TVA Mensuelle)** : Rapport formaté prêt pour la déclaration mensuelle de TVA.
- **G50 (IBS/TAP)** : Rapport consolidé des taxes.
- **Inventaire Annuel** : Rapport global du stock arrêté à une date précise, valorisé pour le bilan comptable.

*Note : Tous les rapports disposent de boutons d'impression et d'export Excel/PDF.*
