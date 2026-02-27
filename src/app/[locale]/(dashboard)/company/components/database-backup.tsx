"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/routing";

export const DatabaseBackup = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const router = useRouter();

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const response = await fetch("/api/backup/export");

            if (!response.ok) {
                throw new Error("Erreur lors de l'exportation");
            }

            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `backup_syncloudpos_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Sauvegarde téléchargée avec succès");
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la sauvegarde");
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) return;

        if (confirmText !== "CONFIRMER") {
            toast.error("Veuillez taper CONFIRMER pour valider");
            return;
        }

        try {
            setIsImporting(true);
            const fileReader = new FileReader();

            fileReader.onload = async (e) => {
                try {
                    const jsonContent = JSON.parse(e.target?.result as string);

                    const response = await fetch("/api/backup/import", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(jsonContent),
                    });

                    if (!response.ok) {
                        throw new Error("Échec de la restauration");
                    }

                    toast.success("Restauration réussie ! Redémarrage...");
                    setOpen(false);
                    setConfirmText("");
                    setSelectedFile(null);

                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);

                } catch (err) {
                    toast.error("Format de fichier invalide");
                }
            };

            fileReader.readAsText(selectedFile);
        } catch (error) {
            console.error(error);
            toast.error("Erreur critique lors de la restauration");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-6 border rounded-lg bg-slate-50 mt-8">
            <div>
                <h3 className="text-lg font-medium">Sauvegarde et Restauration</h3>
                <p className="text-sm text-slate-500">
                    Sauvegardez toutes vos données (produits, clients, commandes) ou restaurez-les depuis un fichier de sauvegarde.
                </p>
            </div>
            <div className="flex gap-4 items-center mt-2">
                <Button
                    onClick={handleExport}
                    disabled={isExporting || isImporting}
                    variant="outline"
                    className="w-full sm:w-auto"
                >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? "Création..." : "Exporter mes données"}
                </Button>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button
                            disabled={isExporting || isImporting}
                            variant="destructive"
                            className="w-full sm:w-auto"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Restaurer des données
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center text-red-600 gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Attention : Action Destructrice
                            </DialogTitle>
                            <DialogDescription>
                                La restauration d'une sauvegarde <b>effacera définitivement toutes vos données actuelles</b> (produits, factures, caisse, etc) pour les remplacer par celles du fichier.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="file">Fichier de sauvegarde (.json)</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".json"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                            </div>

                            <div className="space-y-2 bg-red-50 p-4 border border-red-200 rounded-md">
                                <Label htmlFor="confirm" className="text-red-700 font-bold">
                                    Veuillez taper CONFIRMER pour valider l'effacement :
                                </Label>
                                <Input
                                    id="confirm"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="CONFIRMER"
                                    className="border-red-300"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button
                                variant="destructive"
                                onClick={handleImport}
                                disabled={!selectedFile || confirmText !== "CONFIRMER" || isImporting}
                            >
                                {isImporting ? "Restauration en cours..." : "Lancer la restauration"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};
