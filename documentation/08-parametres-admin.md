# 8. Paramètres & Administration (`/settings`)

Le centre de configuration globale de votre environnement SyncloudPOS.

## 8.1. Profil Utilisateur (Mon Profil)
Les paramètres personnels de l'utilisateur connecté.
- **Informations** : Nom, Email, Téléphone.
- **Sécurité** : Changement de mot de passe.
- **Authentification double facteur (2FA / OTP)** : Activation/Désactivation de la vérification par code lors de la connexion.

## 8.2. Entreprise / Système (Administrateur)
Paramètres appliqués à tous les magasins de l'entreprise.
- **Informations Générales** : Nom de l'entreprise, Adresse, Contacts (Téléphone, Email, Site web).
- **Logo de l'entreprise** : Utilisé sur l'interface et les impressions.
- **Monnaie par défaut** : Ex: DZD, EUR, USD.
- **Format de Date et Heure** : Personnalisation de l'affichage.
- **Thème Visuel** : Forcer le mode Clair ou Sombre.
- **Fuseau Horaire** : Pour l'horodatage des transactions.

## 8.3. Fiscalité Algérienne (Paramètres Fiscaux)
Configuration spécifique pour l'Algérie.
- **Informations légales** : NIF, NIS, NRC, Numéro d'Article (AI), RIB.
- **Champs obligatoires** : Rendre ces champs obligatoires ou facultatifs lors de la création d'un client B2B.

## 8.4. Taxes (TVA) et Devises
- **Liste des Taxes** : Création de nouveaux taux de TVA (ex: 9%, 19%, 0%).
- **Taux par défaut** : Taxe appliquée par défaut sur les nouveaux produits.
- **Méthode d'Arrondi** : Ex: Arrondir au dinar supérieur, aucun arrondi.

## 8.5. Reçus & Impressions
Personnalisation du ticket de caisse imprimé.
- **Logo** : Afficher ou masquer le logo sur le ticket.
- **En-tête et Pied de page** : Textes libres (ex: "Merci de votre visite", "Les marchandises ne sont ni reprises ni échangées").
- **TVA sur ticket** : Afficher le détail de la TVA ou seulement le total TTC.
- **Codes-barres sur reçu** : Ajouter le code-barres de la transaction en bas du ticket pour faciliter les retours.
- **Format** : 80mm ou 58mm.

## 8.6. Magasins (Points de Vente)
Gestion des différentes localisations physiques.
- **Liste des Magasins** : Création, modification, archivage.
- **Détails Magasin** : Nom, Adresse spécifique, Téléphone du local.
- Un magasin possède son propre stock et ses propres caisses (Tiroirs).

## 8.7. Utilisateurs & Permissions (Rôles)
Contrôle d'accès au logiciel.
- **Liste des Utilisateurs** : Inviter de nouveaux employés (Caissier, Vendeur, Manager).
- **Rôles et Permissions (Granulaires)** :
  - Accès au Dashboard (Oui/Non).
  - Voir le coût d'achat (Oui/Non).
  - Modifier les prix de vente en caisse (Oui/Non).
  - Appliquer des remises (Oui/Non).
  - Voir les rapports financiers (Oui/Non).
  - Supprimer des transactions (Oui/Non).
- **Assignation de Magasin** : Restreindre un vendeur à ne voir et n'agir que sur le magasin A, sans accès au magasin B.

## 8.8. Intégrations (Modules Externes)
Connexion de SyncloudPOS à d'autres services.
- **WhatsApp API** : Configuration du token WhatsApp pour l'envoi automatisé de reçus et tickets aux clients. Lier à un numéro d'entreprise.
- **Services de Livraison (Delivery)** : 
  - Configuration de l'API DHD, HDD Express, Yalidine.
  - Saisie de la clé API Fournisseur.
  - Option : Créer l'expédition automatiquement lors d'une vente e-commerce.

## 8.9. Sauvegarde (Backups)
Sécurité des données locales.
- **Télécharger une sauvegarde** : Extraction SQL de la base de données.
- **Restauration** : Ré-importation de la base.
- **Planification** : Définir si la sauvegarde Cloud/Locale se fait automatiquement à chaque clôture de journée.
