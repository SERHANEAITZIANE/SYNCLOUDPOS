"use client"

import { useState } from "react"
import { toast } from "react-hot-toast"
import { Star, TrendingUp, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateLoyaltySettings } from "@/actions/settings"

interface LoyaltySettingsFormProps {
    loyaltyPointsPerDa: number
    loyaltyDaPerPoint: number
}

export const LoyaltySettingsForm = ({ loyaltyPointsPerDa, loyaltyDaPerPoint }: LoyaltySettingsFormProps) => {
    const [loading, setLoading] = useState(false)
    const [pointsPerDa, setPointsPerDa] = useState(loyaltyPointsPerDa.toString())
    const [daPerPoint, setDaPerPoint] = useState(loyaltyDaPerPoint.toString())

    const handleSave = async () => {
        const pPerDa = parseInt(pointsPerDa)
        const dPerPt = parseInt(daPerPoint)
        if (isNaN(pPerDa) || pPerDa < 1 || isNaN(dPerPt) || dPerPt < 1) {
            toast.error("Les valeurs doivent être des entiers positifs")
            return
        }
        setLoading(true)
        const result = await updateLoyaltySettings({ loyaltyPointsPerDa: pPerDa, loyaltyDaPerPoint: dPerPt })
        if (result.error) toast.error(result.error)
        else toast.success("Paramètres de fidélité mis à jour !")
        setLoading(false)
    }

    // Calculate a sample conversion for preview
    const exampleSpend = 1000
    const examplePoints = exampleSpend * parseInt(pointsPerDa || "1")
    const exampleReduction = Math.floor(examplePoints / parseInt(daPerPoint || "100"))

    return (
        <div className="space-y-8">

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                        Points gagnés par DA dépensé
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min="1"
                            max="100"
                            value={pointsPerDa}
                            onChange={e => setPointsPerDa(e.target.value)}
                            className="w-28"
                        />
                        <span className="text-sm text-muted-foreground">point(s) / DA</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Combien de points le client gagne pour chaque DA dépensé.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-violet-500" />
                        Points nécessaires pour 1 DA de réduction
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min="1"
                            value={daPerPoint}
                            onChange={e => setDaPerPoint(e.target.value)}
                            className="w-28"
                        />
                        <span className="text-sm text-muted-foreground">pts = 1 DA</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Combien de points faut-il pour obtenir 1 DA de remise.
                    </p>
                </div>
            </div>

            {/* Live preview */}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    Aperçu du programme de fidélité
                </h3>
                <div className="grid grid-cols-3 divide-x divide-amber-200 dark:divide-amber-700/40 text-center">
                    <div className="px-4 space-y-1">
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{exampleSpend.toLocaleString("fr-FR")}</p>
                        <p className="text-xs text-muted-foreground">DA dépensés</p>
                    </div>
                    <div className="px-4 space-y-1">
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{examplePoints.toLocaleString("fr-FR")}</p>
                        <p className="text-xs text-muted-foreground">Points gagnés</p>
                    </div>
                    <div className="px-4 space-y-1">
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{exampleReduction.toLocaleString("fr-FR")}</p>
                        <p className="text-xs text-muted-foreground">DA de réduction</p>
                    </div>
                </div>
            </div>

            <Button onClick={handleSave} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white">
                {loading ? "Enregistrement..." : "Sauvegarder la configuration"}
            </Button>
        </div>
    )
}
