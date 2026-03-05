# 9. Fonctionnalités d'Intelligence Artificielle (I.A.)

SyncloudPOS intègre des modules d'Intelligence Artificielle pour vous aider à analyser vos données professionnelles sans effort technique.

## 9.1. L'Assistant IA (Chat interactif)
Un chatbot intégré accessible depuis le bouton IA dans le système.

**Fonctions et Options :**
- **Sélecteur de Fournisseur IA** : Choisissez entre OpenAI (ChatGPT), Google Gemini, ou Anthropic Claude (selon votre configuration d'API dans les paramètres).
- **Discussion en Langage Naturel** : Vous pouvez lui poser des questions directes sur vos propres chiffres. Le chatbot a un "contexte" lu en temps réel (sans envoyer de données privées inutilement).
- **Exemples de questions possibles :**
  - "Quel est mon produit le plus vendu cette semaine ?"
  - "Combien je dois au fournisseur X ?"
  - "Quel est le bénéfice net généré par le magasin d'Alger Centre aujourd'hui ?"
  - "Quels sont les produits en rupture de stock qui se vendent le mieux d'habitude ?"
- **Réponses formatées** : L'IA répond avec des chiffres précis tirés de votre base de données.

## 9.2. OCR Factures (Scanner Intelligent)
L'intégration "Optical Character Recognition" dopée à l'IA pour traiter les documents papiers (`/purchases`).

**Fonctionnement :**
- **Action** : Au lieu de taper une facture fournisseur de 50 lignes à la main, prenez la facture en photo ou importez le PDF/Scan.
- **Traitement IA** : L'IA lit le document et identifie le nom du fournisseur, sa date, les produits, les quantités par produit, les prix unitaires et le total.
- **Validation Humaine** : Le système génère un Bon d'Achat prérempli. Vous vérifiez si tout correspond, modifiez si besoin, et validez. L'import est réalisé en 5 secondes.

## 9.3. Prévisions de Ventes (AI Forecast)
Module prédictif pour l'anticipation (`/reorder` / Dashboard).

**Fonctionnement :**
- **Analyse des Tendances** : L'algorithme observe l'historique de vos ventes par produit et par saison.
- **Prédictions** : Au lieu de vous dire "Il vous reste 5 articles, commandez-en", l'IA vous dit "Il vous reste 5 articles. Selon la tendance des 3 derniers mois, vous serez en rupture dans 4 jours. Nous conseillons de recommander 50 articles pour tenir le mois complet."

## 9.4. Alertes Intelligentes (Notifications)
Le système apprend de votre activité pour ne notifier que l'essentiel.
- **Créances risquées** : L'IA repère un client qui dépasse son délai habituel de paiement et vous suggère de le relancer (ou bloque temporairement son crédit en caisse POS).
- **Produits "Dormants"** : Notification suggérant de mettre en promotion des articles qui n'ont fait aucune vente depuis 3 mois, pour libérer de la valeur de stock.
