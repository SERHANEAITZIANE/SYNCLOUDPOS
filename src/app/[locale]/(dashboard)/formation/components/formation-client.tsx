"use client"

import { BookOpen, Monitor, ShoppingCart, Package, Users, Truck, Wallet, BarChart3, Sparkles, Receipt, Building2, FileText } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { ScrollArea } from "@/components/ui/scroll-area"

export const FormationClient = () => {
    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <Heading
                    title="Formation & Guide d'Utilisation"
                    description="Découvrez toutes les fonctionnalités de votre logiciel de gestion."
                />
            </div>

            <Separator />

            <Tabs defaultValue="dashboard" className="w-full h-full flex flex-col md:flex-row gap-6">
                <TabsList className="flex md:flex-col h-auto justify-start sticky top-0 md:w-64 space-y-1 bg-transparent p-0">
                    <TabsTrigger value="dashboard" className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                        <Monitor className="h-4 w-4" /> Tableau de Bord
                    </TabsTrigger>
                    <TabsTrigger value="pos" className="w-full justify-start gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:shadow-sm">
                        <ShoppingCart className="h-4 w-4" /> Caisse (POS)
                    </TabsTrigger>
                    <TabsTrigger value="stocks" className="w-full justify-start gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:shadow-sm">
                        <Package className="h-4 w-4" /> Catalogue & Stocks
                    </TabsTrigger>
                    <TabsTrigger value="sales" className="w-full justify-start gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm">
                        <Receipt className="h-4 w-4" /> Ventes (BL)
                    </TabsTrigger>
                    <TabsTrigger value="purchases" className="w-full justify-start gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-sm">
                        <Truck className="h-4 w-4" /> Achats & Dépenses
                    </TabsTrigger>
                    <TabsTrigger value="treasury" className="w-full justify-start gap-2 data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 data-[state=active]:shadow-sm">
                        <Wallet className="h-4 w-4" /> Trésorerie
                    </TabsTrigger>
                    <TabsTrigger value="contacts" className="w-full justify-start gap-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">
                        <Users className="h-4 w-4" /> Clients & Fournisseurs
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="w-full justify-start gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                        <BarChart3 className="h-4 w-4" /> Analyses
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="w-full justify-start gap-2 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">
                        <Sparkles className="h-4 w-4" /> Intelligence IA
                    </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 h-[calc(100vh-200px)] rounded-xl border bg-white shadow-sm p-6">
                    {/* DASHBOARD */}
                    <TabsContent value="dashboard" className="m-0 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <Monitor className="h-6 w-6 text-blue-600" />
                                Tableau de Bord
                            </h2>
                            <p className="text-gray-500">Aperçu global de l'activité de votre commerce.</p>
                        </div>
                        <img
                            src="https://placehold.co/1200x600/f8fafc/0f172a?text=Capture:+Tableau+de+Bord+Principal"
                            alt="Dashboard"
                            className="rounded-lg shadow border"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <Card className="shadow-none border-gray-100 bg-gray-50/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Indicateurs Clés</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p>Surveillez en temps réel votre <strong>Chiffre d'affaires</strong>, le <strong>nombre de ventes</strong> et vos <strong>clients inscrits</strong>.</p>
                                    <p>Un graphique vous montre l'évolution des revenus sur le mois.</p>
                                </CardContent>
                            </Card>
                            <Card className="shadow-none border-gray-100 bg-gray-50/50">
                                <CardHeader>
                                    <CardTitle className="text-lg text-orange-600">Alertes de Stock</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p>Identifiez immédiatement les produits <strong>en rupture</strong> ou <strong>sous le seuil de sécurité</strong>.</p>
                                    <p>Un clic permet de préparer rapidement une commande fournisseur.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* POINT OF SALE */}
                    <TabsContent value="pos" className="m-0 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <ShoppingCart className="h-6 w-6 text-green-600" />
                                Caisse (POS)
                            </h2>
                            <p className="text-gray-500">Réalisez vos ventes de détail rapidement et éditez des tickets de caisse.</p>
                        </div>
                        <img
                            src="https://placehold.co/1200x600/f0fdf4/166534?text=Capture:+Interface+de+Caisse+(POS)"
                            alt="POS Interface"
                            className="rounded-lg shadow border"
                        />
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold border-b pb-2">Les 3 étapes d'une vente :</h3>

                            <div className="grid gap-6">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold flex-shrink-0">1</div>
                                    <div>
                                        <h4 className="font-semibold text-lg">Ajouter les produits au panier</h4>
                                        <p className="text-gray-600">Utilisez votre douchette code-barre, recherchez par nom, ou cliquez sur les catégories. Vous pouvez ajuster les prix, appliquer des remises manuelles, ou utiliser une quantité négative pour enregistrer un retour marchandise.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold flex-shrink-0">2</div>
                                    <div>
                                        <h4 className="font-semibold text-lg">Valider le paiement (F9)</h4>
                                        <p className="text-gray-600">Cliquez sur Paiement ou tapez F9. Si le client est enregistré, vous pouvez lui attribuer la vente. Entrez le montant donné par le client et le système calcule automatiquement la monnaie à rendre.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold flex-shrink-0">3</div>
                                    <div>
                                        <h4 className="font-semibold text-lg">Imprimer le ticket</h4>
                                        <p className="text-gray-600">Le système génère un ticket de caisse professionnel contenant tous les détails, y compris le solde du client et le BL associé (si pertinent).</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* CATALOGUE & STOCKS */}
                    <TabsContent value="stocks" className="m-0 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <Package className="h-6 w-6 text-orange-600" />
                                Catalogue & Stocks
                            </h2>
                            <p className="text-gray-500">Gérez vos catégories, marques, code-barres et tarifs.</p>
                        </div>
                        <img
                            src="https://placehold.co/1200x500/fff7ed/9a3412?text=Capture:+Liste+des+Produits"
                            alt="Products"
                            className="rounded-lg shadow border"
                        />
                        <div className="space-y-4">
                            <Card className="shadow-none border-gray-100 bg-gray-50/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Paramètres du Produit</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                                        <li><strong>Code-barres :</strong> Attribuez le code-barre constructeur. Pour les produits sans code, l'application peut en générer et vous pouvez imprimer vos propres étiquettes code-barre.</li>
                                        <li><strong>Prix Multiples :</strong> Prix d'achat, Prix de Vente (Détail), Prix Gros, Prix Revendeur.</li>
                                        <li><strong>Stock :</strong> Stock actuel, Seuil minimum d'alerte.</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card className="shadow-none border-gray-100 bg-orange-50/30">
                                <CardHeader>
                                    <CardTitle className="text-lg flex flex-row items-center gap-2 text-orange-800">
                                        <FileText className="w-5 h-5" /> Générateur de Catalogue (Price List)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="mb-4">Créez des PDF ou des messages texte (WhatsApp) de vos produits en un clic.</p>
                                    <img
                                        src="https://placehold.co/1200x300/ffedd5/c2410c?text=Capture:+Modal+Catalogue+de+Prix"
                                        alt="Pricelist Modal"
                                        className="rounded border mb-4"
                                    />
                                    <p className="text-sm text-gray-600">Choisissez la cible (Grossiste, Détaillant) et la catégorie, et le système formatte automatiquement le catalogue avec ou sans images.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* VENTES & BL */}
                    <TabsContent value="sales" className="m-0 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <Receipt className="h-6 w-6 text-indigo-600" />
                                Ventes (Bons de Livraison)
                            </h2>
                            <p className="text-gray-500">Pour les grosses commandes B2B nécessitant des factures ou BL A4.</p>
                        </div>
                        <img
                            src="https://placehold.co/1200x500/eef2ff/3730a3?text=Capture:+Liste+des+Ventes+BL"
                            alt="Sales"
                            className="rounded-lg shadow border"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <Card className="shadow-none border-indigo-100 bg-indigo-50/30">
                                <CardHeader>
                                    <CardTitle className="text-lg">Bons de Livraison (BL)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700">Diminue le stock officiellement. Génère un document A4 très professionnel contenant vos coordonnées. Si la vente n'est pas soldée, la différence va dans le crédit du client.</p>
                                </CardContent>
                            </Card>
                            <Card className="shadow-none border-gray-100 bg-gray-50/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Facture Proforma / Devis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700">Création d'une pré-vente pour le client. N'affecte PAS le stock. Elle peut ensuite être convertie en BL définitif.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* ACHATS */}
                    <TabsContent value="purchases" className="m-0 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <Truck className="h-6 w-6 text-red-600" />
                                Achats & Dépenses
                            </h2>
                            <p className="text-gray-500">Entrées de stock, achats fournisseurs et charges courantes.</p>
                        </div>

                        <div className="space-y-6">
                            <Card className="shadow-none border-red-100">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-red-500" /> L'OCR des Bon d'Achats (Smart Scan)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p>Lors de l'ajout d'un bon fournisseur, vous pouvez uploader la photo du reçu papier. L'Intelligence Artificielle de l'application va :</p>
                                    <ul className="list-decimal pl-5 space-y-1 text-gray-700 font-medium">
                                        <li>Détecter le fournisseur</li>
                                        <li>Lister automatiquement les produits</li>
                                        <li>Remplir les quantités et les prix unitaires</li>
                                    </ul>
                                    <img
                                        src="https://placehold.co/1200x400/fef2f2/991b1b?text=Capture:+OCR+Bon+Fournisseur"
                                        alt="OCR"
                                        className="rounded border"
                                    />
                                </CardContent>
                            </Card>

                            <Card className="shadow-none border-gray-100 bg-gray-50/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Gestion des Dépenses (Charges)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700">Enregistrez vos loyers, factures d'électricité, salaires, repas. Créez des catégories de dépenses pour analyser précisément où part votre argent en fin de mois dans le tableau des analyses.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* TRESORERIE */}
                    <TabsContent value="treasury" className="m-0 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <Wallet className="h-6 w-6 text-cyan-600" />
                                Trésorerie & Opérations
                            </h2>
                            <p className="text-gray-500">Le centre névralgique de vos liquidités et comptes bancaires.</p>
                        </div>
                        <img
                            src="https://placehold.co/1200x500/ecfeff/155e75?text=Capture:+Comptes+de+Trésorerie"
                            alt="Treasury"
                            className="rounded-lg shadow border"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <Card className="shadow-none border-gray-100 bg-gray-50/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Comptes multiples</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                                        <li>Caisse Principale (Tiroir)</li>
                                        <li>Compte Bancaire A</li>
                                        <li>Compte CCP, etc.</li>
                                    </ul>
                                    <p className="mt-3 text-sm text-gray-500">Chaque vente, achat, dépense est rattaché à un compte, assurant un solde toujours juste.</p>
                                </CardContent>
                            </Card>
                            <Card className="shadow-none border-gray-100 bg-gray-50/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Transferts (Virements)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700">Vous pouvez déplacer des fonds d'un compte à un autre (ex: de la caisse principale vers la banque en fin de semaine) pour garantir la traçabilité de tout votre argent.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* CONTACTS */}
                    <TabsContent value="contacts" className="m-0 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <Users className="h-6 w-6 text-purple-600" />
                                Clients, Fournisseurs & Crédits
                            </h2>
                            <p className="text-gray-500">Gérez votre répertoire et surtout les emprunts et recouvrements.</p>
                        </div>
                        <img
                            src="https://placehold.co/1200x500/faf5ff/6b21a8?text=Capture:+Liste+des+Clients"
                            alt="Contacts"
                            className="rounded-lg shadow border"
                        />
                        <div className="space-y-4 pt-4">
                            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-lg">
                                <h3 className="font-bold text-purple-800 text-lg mb-2">Comment fonctionnent les Dettes (Balances) ?</h3>
                                <div className="space-y-3 text-gray-700">
                                    <p><strong>1. Génération de dette :</strong> Quand vous vendez à crédit, ou si un paiement client est inférieur au montant total du ticket/BL, la balance du client devient Négative (il vous doit de l'argent).</p>
                                    <p><strong>2. Recouvrement (Remboursement Client) :</strong> Le client revient payer. Vous allez dans Clients &gt; "Remboursement Client". Vous encaissez l'argent sur votre Caisse. La balance du client remonte vers zéro.</p>
                                    <p><strong>3. Emprunt Fournisseur :</strong> Le même système existe pour les fournisseurs. Sauf qu'une dette envers un fournisseur est représentée par une balance Négative du fournisseur (vous lui devez de l'argent).</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ANALYTIQUE */}
                    <TabsContent value="analytics" className="m-0 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <BarChart3 className="h-6 w-6 text-blue-600" />
                                Rapports & Analyses
                            </h2>
                            <p className="text-gray-500">Les mathématiques de votre business, en temps réel.</p>
                        </div>
                        <img
                            src="https://placehold.co/1200x600/f8fafc/0f172a?text=Capture:+Page+Analytics"
                            alt="Analytics"
                            className="rounded-lg shadow border"
                        />
                        <Card className="shadow-none border-gray-100 bg-gray-50/50 mt-6">
                            <CardContent className="pt-6 space-y-4">
                                <ul className="list-disc pl-5 space-y-3 text-gray-700 text-lg">
                                    <li><strong>Valeur du Stock :</strong> Combien d'argent dort dans vos rayons (basé sur le coût d'achat).</li>
                                    <li><strong>Bénéfice Brut :</strong> Ventes Totales moins le Coût d'Achats des marchandises vendues (Marge Commerciale).</li>
                                    <li><strong>Bénéfice Net :</strong> Bénéfice Brut moins les Dépenses (Loyers, factures, etc.). C'est votre gain réel.</li>
                                    <li><strong>Hit Parade :</strong> Visualisez toujours quels sont les top produits (qui se vendent le plus) et les top clients (ceux qui rapportent le plus de CA).</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* IA */}
                    <TabsContent value="ai" className="m-0 space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <Sparkles className="h-6 w-6 text-violet-600" />
                                Intelligence IA
                            </h2>
                            <p className="text-gray-500">Posez des questions directes sur vos finances à une Intelligence Artificielle intégrée.</p>
                        </div>
                        <img
                            src="https://placehold.co/1200x500/f5f3ff/5b21b6?text=Capture:+Page+IA+(Chat)"
                            alt="AI"
                            className="rounded-lg shadow border"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <Card className="shadow-none border-gray-100 bg-violet-50/30">
                                <CardHeader>
                                    <CardTitle className="text-lg">Modèles au choix</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 mb-3">Sélectionnez le modèle d'IA de votre choix (Google Gemini, OpenAI ChatGPT, Anthropic Claude, ou Kimi). <strong>Vous insérez votre propre clé API (qui reste sauvegardée dans VÔTRE navigateur uniquement).</strong></p>
                                </CardContent>
                            </Card>
                            <Card className="shadow-none border-gray-100 bg-gray-50/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Le Super Pouvoir</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700">L'IA connaît *toutes* vos statistiques du mois actuel :</p>
                                    <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-600 font-medium">
                                        <li>Produits en rupture</li>
                                        <li>Top 10 des revenus</li>
                                        <li>Dépenses vs Ventes</li>
                                        <li>Liste de tous les clients endettés</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    )
}
