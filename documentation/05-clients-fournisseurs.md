# 5. Clients & Fournisseurs

Gestion complète de la base de données relationnelle et des dettes/crédits externes.

## 5.1. Clients (`/customers`)
Base de données des acheteurs, professionnels (B2B) ou particuliers (B2C).

### 5.1.1. Liste des Clients
- **Tableau** : Nom, Téléphone, Email, Solde Dette (Montant dû), Total des achats.

### 5.1.2. Fiche Client & Création
**Champs disponibles :**
- **Type de Client** : Particulier / Entreprise.
- **Nom Complet / Raison Sociale** : Le nom principal de contact ou de l'entreprise.
- **Contact** : Téléphone, Email.
- **Adresse** : Ligne 1, Ligne 2, Code Postal, Ville, Pays.
- **Informations Fiscales Algériennes (Obligatoire pour facturation officielle B2B)** :
  - **NIF** : Numéro d'Identification Fiscale (15 chiffres).
  - **NIS** : Numéro d'Identification Statistique (15 chiffres).
  - **NRC** : Numéro de Registre de Commerce.
  - **Art. d'Imposition (AI)** : Numéro d'article d'imposition.
  - **RIB / Compte Bancaire** : (Format algérien, souvent CCP ou Banque).
- **Groupe de Prix Attribué** : Par défaut: Détail. Peut être forcé sur Prix Gros ou Prix Revendeur pour que la caisse applique automatiquement ces prix à ce client.

### 5.1.3. Détail d'un Client (Profil étendu)
- **Aperçu** : CA total avec le client, Solde de ses dettes non payées, Date du dernier achat.
- **Onglet "Historique des Achats"** : Toutes les factures/tickets de ce client.
- **Onglet "Historique de Paiement"** : Quand il a payé ses dettes.
- **Paiement de Dette** : Bouton pour enregistrer le règlement (partiel ou total) de ce que le client doit. Saisie du montant reçu, met à jour le solde et alimente la trésorerie.

## 5.2. Emprunts Clients (`/emprunt`)
Différent du crédit lors de l'achat en magasin. C'est l'enregistrement d'un prêt d'argent distinct ou avance sur compte.
- **Créer un Emprunt** : Choix du Client, Montant du prêt accordé, Date d'échéance.
- **Suivi** : Tableau des emprunts actifs, échus.
- **Remboursement** : Renseigner les paiements reçus (partiels). Le logiciel calculera le "Reste à payer".

## 5.3. Fournisseurs (`/suppliers`)
Ceux chez qui le magasin s'approvisionne. La structure est presque identique à celle des clients, inversée comptablement.

### 5.3.1. Liste et Fiche Fournisseur
Mêmes champs que les clients (Nom, Contact, Informations Fiscales Complètes NIF/NIS/NRC/RIB...).

### 5.3.2. Crédit Fournisseur (Soldes et Dettes)
- **Solde Fournisseur** : Ce que votre entreprise doit à ce fournisseur.
- Ce solde augmente lorsque vous enregistrez un Achat avec statut de paiement "Partiel" ou "Non payé".
- **Enregistrer un Paiement Fournisseur** : Permet de diminuer la dette. Le paiement déduit la trésorerie (Compte Bancaire ou Caisse désignée) du magasin.

## 5.4. Emprunts Fournisseurs (`/emprunt-fournisseur`)
Gestion des avances d'argent faites PAR le fournisseur, ou prêts consentis envers l'entreprise.
- **Création** : Sélection Fournisseur, Montant prêté, Conditions, Échéance.
- **Remboursement** : Enregistrement des virements ou remises d'espèces pour rembourser l'emprunt au fournisseur. Déduction de trésorerie locale.

## 5.5. Groupes / Types de Clients
- **Paramétrage** : Configuration globale permettant de classer les clients dans des catégories ("VIP", "Grossistes", "Détaillants Réguliers").
- Permet de lier des promotions spécifiques ou listes de prix.
