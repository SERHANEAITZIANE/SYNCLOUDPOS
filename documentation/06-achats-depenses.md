# 6. Achats, Bons de Commande & Dépenses

Ce module gère vos flux entrants (stock et matériel) et toutes les charges de la société.

## 6.1. Bons de Commande d'Achat (BCA ou BDC Fournisseur) (`/purchases`)
Pour passer commande chez un fournisseur avant réception effective.

**Étapes et Champs :**
- **Création du BDC** : Choix du Magasin de destination, du Fournisseur, et de la Date.
- **Ajout des Produits** : Recherche et ajout des articles souhaités. Saisie de la Quantité et modification éventuelle du Coût unitaire d'Achat.
- **Réduction/Frais** : Ajout d'une éventuelle remise fournisseur ou frais de port.
- **Statut de Commande** : "En Attente", "Partiellement Reçu", "Reçu", "Annulé".
- **Génération PDF** : Impression du bon de commande pour envoi par e-mail ou WhatsApp au fournisseur.

## 6.2. Réceptions Fournisseurs (Factures d'Achat)
Une fois la marchandise reçue, le BDC est transformé en Facture d'Achat, ou une facture d'achat est créée directement.

**Impact et Options :**
- **Stock** : Le stock du magasin de destination est immédiatement *incrémenté* des quantités exactes reçues.
- **Prix d'Achat Moyen Pondéré (PMP)** : Calcul automatique si le prix d'achat enregistré est différent de l'ancien coût. Met à jour le catalogue.
- **Statut de Paiement** :
  - **Payé** : Saisie du montant payé. Déduit la caisse/banque choisie.
  - **Non Payé** : Le montant total est ajouté à la dette fournisseur.
  - **Partiel** : Le reste à payer est ajouté à la dette fournisseur.
- **Numéro de Référence** : Permet de lier l'enregistrement avec la facture papier remise par le fournisseur pour la comptabilité.

## 6.3. Gestion des Dépenses (Notes de Frais) (`/expenses`)
Pour enregistrer toutes les sorties d'argent qui ne sont pas des achats de marchandises destinées à la revente.

**Champs de la Fiche Dépense :**
- **Sujet / Titre de la Dépense** : Ex: "Salaire vendeur A", "Paiement électricité SONELGAZ".
- **Catégorie** : Sélection via liste déroulante (Loyer, Salaire, Transport, Utilités, Fiscalité, Divers). Peut être gérée dans les paramètres.
- **Magasin Associé** : Ou "Applicable à l'entreprise globale".
- **Date d'exécution** : Horodatage comptable.
- **Méthode de Paiement** : Espèces, Carte, Chèque, Virement bancaire.
- **Montant Total (TTC)** : En DZD.
- **Pièce jointe (Upload)** : Possibilité de scanner ou photographier la facture, le reçu ou la fiche de paie et de l'attacher (PDF, JPG, PNG).

## 6.4. Retour Fournisseur
Renvoi de marchandises défectueuses ou non conformes.
- Déduit les quantités concernées du stock du magasin.
- Annule ce montant dans les paiements (ou crée un avoir fournisseur dans la dette de celui-ci).
