# 7. Finance & Trésorerie (Treasury)

Le module de comptabilité et de trésorerie consolidée (`/treasury`), assurant la traçabilité de chaque dinar entrant ou sortant.

## 7.1. Gestion des Caisses (Registers / Tills)
Tiroirs-caisses physiques du point de vente affiliés aux magasins.

**Options disponibles :**
- **Créer une Caisse** : Nom, Magasin affilié, Solde d'ouverture initial.
- **Liste des Caisses** : Affiche toutes les caisses actives et leur "Solde Réel".
- **Détail Caisse** :
  - Opérations (Toutes les recettes POS, Dépenses associées, Remboursements tirés de cette caisse).
  - Graphiques de flux.

## 7.2. Comptes Bancaires
Comptes liés à l'entreprise globale (CCP, CNEP, BDL, BNA, etc.).

**Options disponibles :**
- **Ajout Compte** : Nom de la banque, RIB, Nom titulaire, Solde initial.
- **Mouvements** : Encaissements CB au POS, Virements de fournisseurs d'accès, Virements de/vers clients institutionnels.

## 7.3. Virements Internes (Transferts de Fonds)
Déplacer l'argent physiquement ou électroniquement au sein de l'entreprise.

**Opérations possibles :**
- **Caisse -> Banque (Dépôt)** : Versement de la recette du jour au compte bancaire "BNA".
- **Banque -> Caisse (Retrait/Alimentation)** : Injection de fonds de caisse (monnaie).
- **Caisse A -> Caisse B** : Mouvement entre deux magasins.
- **Champs requis** : Montant transféré, Date, Type de virement, Note/Référence. Les déductions et additions s'équilibrent automatiquement = Aucun impact sur le chiffre d'affaires.

## 7.4. Grand Livre (Ledger)
L'historique absolu et infalsifiable de toutes les transactions financières (Débit / Crédit) générées automatiquement par toutes les actions du logiciel (Ventes, Achats, Dépenses).

**Colonnes du journal :**
- Date précise.
- ID Transaction (Référence système).
- Type d'Opération (Achat, Dépense, Vente, Paiement prêt).
- Compte Source.
- Compte Destination.
- Montant Débit.
- Montant Crédit.
- Résultat sur le Solde.

## 7.5. Factures Récurrentes (`/recurring-invoices`)
Pour l'automatisation de facturations périodiques (Abonnements, contrats d'entretien).
- **Création du plan** : Choix du Client, Modèle de facture (Produits/Services récurrents).
- **Fréquence** : Journalière, Hebdomadaire, Mensuelle, Annuelle.
- **Lancement** : Le système génère automatiquement une facture impayée le jour J et notifie le client/l'administrateur.

## 7.6. Clôture de Journée (Daily Close) (`/cloture`)
L'étape de validation en fin de poste ou journée d'ouverture.

**Fonctionnement :**
- **Démarrage Session** : Enregistre le "Solde au début".
- En cours de journée, compte toutes les Ventes En Espèces, CB, Crédits.
- **Validation Fin de Poste** : L'utilisateur saisit ce qu'il a "compté réellement" dans son tiroir.
- **Écarts (Différences)** : Le logiciel croise le Solde théorique ('Ce qui aurait dû être') et Solde réel ('Ce qui est déclaré'). S'il y a Manquant ou Surplus, il est enregistré et justifié.
- **Bordereau PDF** : Imprime et valide la journée. Le solde est scellé.
