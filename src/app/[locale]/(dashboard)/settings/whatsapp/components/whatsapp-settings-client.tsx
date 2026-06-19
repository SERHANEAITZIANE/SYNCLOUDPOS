"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import toast from "react-hot-toast"
import { updateWhatsappSettings } from "@/actions/whatsapp-settings"
import { checkWhatsappConnection, disconnectWhatsapp } from "@/actions/whatsapp"
import { QrCode, Smartphone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export const WhatsappSettingsClient = ({ initialData }: { initialData: any }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<"NONE" | "FREE" | "AUTOMATIC">(initialData.whatsappMode || "NONE")
    const [autoReceipt, setAutoReceipt] = useState(initialData.whatsappAutoReceipt || false)
    const [autoInvoice, setAutoInvoice] = useState(initialData.whatsappAutoInvoice || false)
    const [paymentReminder, setPaymentReminder] = useState(initialData.whatsappPaymentReminder || false)

    const [qrCode, setQrCode] = useState<string | null>(null)
    const [status, setStatus] = useState<string>(initialData.whatsappStatus || "DISCONNECTED")

    useEffect(() => {
        if (mode === "AUTOMATIC") {
            fetchConnectionStatus()
            // Poll every 5 seconds if waiting for QR or connecting
            const interval = setInterval(() => {
                if (status !== "CONNECTED") fetchConnectionStatus()
            }, 5000)
            return () => clearInterval(interval)
        }
    }, [mode, status])

    const fetchConnectionStatus = async () => {
        try {
            const res = await checkWhatsappConnection()
            setStatus(res.status)
            if (res.qrcode) setQrCode(res.qrcode)
        } catch (error) {
            console.error(error)
        }
    }

    const onSave = async () => {
        try {
            setLoading(true)
            await updateWhatsappSettings({
                whatsappMode: mode,
                whatsappAutoReceipt: autoReceipt,
                whatsappAutoInvoice: autoInvoice,
                whatsappPaymentReminder: paymentReminder
            })
            toast.success("Paramètres enregistrés")
            router.refresh()
        } catch (error) {
            toast.error("Erreur lors de la sauvegarde")
        } finally {
            setLoading(false)
        }
    }

    const onDisconnect = async () => {
        try {
            setLoading(true)
            await disconnectWhatsapp()
            setStatus("DISCONNECTED")
            setQrCode(null)
            toast.success("Déconnecté de WhatsApp")
            router.refresh()
        } catch (error) {
            toast.error("Erreur lors de la déconnexion")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Intégration WhatsApp</h2>
                <p className="text-muted-foreground">Gérez comment vous communiquez avec vos clients via WhatsApp.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Mode de fonctionnement</CardTitle>
                    <CardDescription>Choisissez comment envoyer les messages WhatsApp.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup 
                        value={mode} 
                        onValueChange={(val: any) => setMode(val)}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                        {/* NONE */}
                        <div>
                            <RadioGroupItem value="NONE" id="none" className="peer sr-only" />
                            <Label
                                htmlFor="none"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                <span className="font-semibold mb-2">Désactivé</span>
                                <span className="text-sm text-muted-foreground text-center">Aucune fonctionnalité WhatsApp</span>
                            </Label>
                        </div>
                        {/* FREE */}
                        <div>
                            <RadioGroupItem value="FREE" id="free" className="peer sr-only" />
                            <Label
                                htmlFor="free"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                <Smartphone className="mb-3 h-6 w-6" />
                                <span className="font-semibold mb-1">Mode Lien Direct (Gratuit)</span>
                                <span className="text-sm text-muted-foreground text-center">
                                    Ouvre WhatsApp sur votre appareil. Vous devez appuyer sur Envoyer manuellement.
                                </span>
                            </Label>
                        </div>
                        {/* AUTOMATIC */}
                        <div>
                            <RadioGroupItem value="AUTOMATIC" id="auto" className="peer sr-only" />
                            <Label
                                htmlFor="auto"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                <QrCode className="mb-3 h-6 w-6 text-primary" />
                                <span className="font-semibold mb-1 text-primary">Mode Automatique ⭐</span>
                                <span className="text-sm text-muted-foreground text-center">
                                    Scannez un QR code une fois. Les messages sont envoyés tout seuls en arrière-plan.
                                </span>
                            </Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>

            {mode === "AUTOMATIC" && (
                <Card className="border-primary/50 shadow-md">
                    <CardHeader className="bg-primary/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                            Connexion WhatsApp Web
                            {status === "CONNECTED" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                            {status === "QR_READY" && <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />}
                            {status === "DISCONNECTED" && <AlertCircle className="h-5 w-5 text-destructive" />}
                        </CardTitle>
                        <CardDescription>Liez votre téléphone pour autoriser le système à envoyer des messages.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {status === "CONNECTED" ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-6">
                                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                                </div>
                                <h3 className="text-xl font-medium">Connecté avec succès</h3>
                                <p className="text-muted-foreground text-center max-w-sm">
                                    SYNCLOUDPOS est autorisé à envoyer des messages. Gardez votre téléphone connecté à internet.
                                </p>
                                <Button variant="destructive" onClick={onDisconnect} disabled={loading}>
                                    Déconnecter
                                </Button>
                            </div>
                        ) : status === "QR_READY" && qrCode ? (
                            <div className="flex flex-col items-center justify-center space-y-4 py-6">
                                <h3 className="text-lg font-medium">Scannez ce QR Code</h3>
                                <p className="text-sm text-muted-foreground">Ouvrez WhatsApp sur votre téléphone {">"} Appareils Liés {">"} Connecter un appareil.</p>
                                <div className="bg-white p-4 rounded-xl shadow-sm border">
                                    {qrCode.startsWith('data:image') ? (
                                        <img src={qrCode} alt="WhatsApp QR Code" className="h-64 w-64" />
                                    ) : (
                                        <img src={`data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="h-64 w-64" />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center space-y-4 py-6">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="text-muted-foreground">Initialisation de la connexion WhatsApp...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Automatisations</CardTitle>
                    <CardDescription>Définissez quand envoyer des messages automatiques (nécessite le mode Automatique).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Reçu de caisse automatique</Label>
                            <p className="text-sm text-muted-foreground">
                                Envoyer automatiquement un reçu après chaque vente sur le POS si le client a un numéro enregistré.
                            </p>
                        </div>
                        <Switch 
                            checked={autoReceipt} 
                            onCheckedChange={setAutoReceipt} 
                            disabled={mode !== "AUTOMATIC"}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Facture B2B automatique</Label>
                            <p className="text-sm text-muted-foreground">
                                Envoyer la facture PDF après validation d'une commande de type Facture/BL.
                            </p>
                        </div>
                        <Switch 
                            checked={autoInvoice} 
                            onCheckedChange={setAutoInvoice}
                            disabled={mode !== "AUTOMATIC"}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Rappels de paiement</Label>
                            <p className="text-sm text-muted-foreground">
                                Envoyer des rappels automatiques aux clients ayant un solde impayé (nécessite un cron job).
                            </p>
                        </div>
                        <Switch 
                            checked={paymentReminder} 
                            onCheckedChange={setPaymentReminder}
                            disabled={mode !== "AUTOMATIC"}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={onSave} disabled={loading} size="lg">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les paramètres
                </Button>
            </div>
        </div>
    )
}
