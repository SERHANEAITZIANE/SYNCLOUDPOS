# 1. Introduction & Connexion

Bienvenue dans la documentation complète de **SyncloudPOS**, le logiciel de gestion multi-magasins, cloud et local, conçu pour les commerces en Algérie et ailleurs.

Cette section couvre l'accès au système et la configuration initiale.

## 1.1. Page de Connexion (`/login`)
La passerelle sécurisée pour accéder à votre espace de travail.

**Champs et options disponibles :**
- **Email** : L'adresse e-mail associée à votre compte utilisateur.
- **Mot de passe** : Votre mot de passe sécurisé.
- **Bouton "Se connecter"** : Valide les identifiants.
- **Lien "Mot de passe oublié ?"** : Permet de réinitialiser le mot de passe via l'envoi d'un e-mail ou SMS.
- **Sélecteur de langue** : Permet de basculer l'interface de connexion entre Français, Anglais et Arabe.

## 1.2. Page d'Inscription (`/register`)
Pour les nouveaux administrateurs souhaitant créer un espace "Tenant" (locataire) pour leur entreprise.

**Champs et options disponibles :**
- **Nom de l'entreprise** : Nom officiel du commerce.
- **Nom complet de l'administrateur** : Prénom et nom du gérant.
- **Email** : Adresse e-mail de contact et de connexion.
- **Numéro de téléphone** : Utilisé pour la communication et potentiellement l'OTP (One-Time Password).
- **Mot de passe & Confirmation** : Création du mot de passe administrateur.

## 1.3. Vérification OTP (`/verify-otp`)
Une étape de sécurité supplémentaire (Authentification à double facteur).

**Champs et options disponibles :**
- **Code OTP (6 chiffres)** : Code reçu par SMS ou e-mail à saisir pour valider la connexion ou une action sensible.
- **Bouton "Renvoyer le code"** : Si le code n'a pas été reçu.

## 1.4. Sélection du Magasin / Point de Vente (`/select-store`)
Si votre compte est associé à plusieurs magasins (Multi-magasins), cette page apparaît après la connexion.

**Options disponibles :**
- **Liste des magasins autorisés** : Affiche les magasins sous forme de cartes (Nom, Adresse).
- **Bouton "Entrer" sur chaque carte** : Sélectionne le magasin actif pour la session courante. Le stock, les ventes et les caisses seront filtrés selon ce choix.

## 1.5. Barre de Navigation Supérieure (Top Navbar)
Accessible depuis presque toutes les pages du logiciel une fois connecté.

**Options disponibles :**
- **Menu Burger** : Ouvre/réduit la barre latérale gauche (Sidebar).
- **Sélecteur de Magasin** : Permet de basculer rapidement d'un magasin à l'autre sans se déconnecter (si permissions suffisantes).
- **Mode Sombre / Clair** : Bascule le thème visuel de l'application.
- **Sélecteur de Langue** : Change la langue de l'interface en temps réel (FR, EN, AR) avec support RTL pour l'Arabe.
- **Bouton POS (Caisse)** : Raccourci direct pour ouvrir l'interface de vente finale.
- **Menu Utilisateur (Avatar)** : 
  - Mon Profil (Paramètres personnels)
  - Paramètres de l'entreprise (Si Admin)
  - Déconnexion
