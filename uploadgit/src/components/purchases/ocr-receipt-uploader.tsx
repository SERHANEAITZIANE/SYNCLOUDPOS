"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Upload, Loader2, FileText, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { createWorker } from "tesseract.js"
import { toast } from "react-hot-toast"
import { Progress } from "@/components/ui/progress"

interface OcrReceiptUploaderProps {
    onProductsExtracted: (items: { name: string, price: number, quantity: number }[]) => void;
    disabled?: boolean;
}

export const OcrReceiptUploader: React.FC<OcrReceiptUploaderProps> = ({
    onProductsExtracted,
    disabled
}) => {
    const [image, setImage] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [statusText, setStatusText] = useState("")

    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const imageUrl = URL.createObjectURL(file);
        setImage(imageUrl);
        await processImage(imageUrl);
    }

    const processImage = async (imageUrl: string) => {
        setIsProcessing(true);
        setProgress(0);
        setStatusText("Initialisation de l'OCR...");

        try {
            const worker = await createWorker('fra+eng', 1, {
                logger: (m: any) => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100));
                        setStatusText(`Analyse en cours... ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            setStatusText("Extraction du texte...");
            const { data: { text } } = await worker.recognize(imageUrl);

            setStatusText("Analyse des produits...");
            const extractedItems = parseReceiptText(text);

            if (extractedItems.length > 0) {
                toast.success(`${extractedItems.length} articles trouvés !`);
                onProductsExtracted(extractedItems);
            } else {
                toast.error("Aucun article clairement identifié. Veuillez vérifier l'image.");
            }

            await worker.terminate();
        } catch (error) {
            console.error("OCR Error:", error);
            toast.error("Erreur lors de l'analyse OCR.");
        } finally {
            setIsProcessing(false);
            setStatusText("");
        }
    }

    // Smart parser for receipt lines (handles both tabular data and multi-line names)
    const parseReceiptText = (text: string) => {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const items: { name: string, price: number, quantity: number }[] = [];

        let currentNameBuffer: string[] = [];

        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            // Skip common headers/footers
            if (lowerLine.includes('total') || lowerLine.includes('tva') || lowerLine.includes('merci') ||
                lowerLine.includes('tel') || lowerLine.startsWith('n°') ||
                lowerLine.includes('désignation') || lowerLine.includes('net a payer')) {
                currentNameBuffer = []; // reset buffer
                continue;
            }

            // Normalize line: replace comma with dot
            let normLine = line.replace(/,/g, '.');
            // Remove spaces inside numbers (e.g. 12 000.00 -> 12000.00)
            normLine = normLine.replace(/(\d)\s+(?=\d{3})/g, '$1');

            const tokens = normLine.split(/\s+/);
            const numTokens: { val: number, index: number }[] = [];

            for (let i = 0; i < tokens.length; i++) {
                // If token is a number or money-like
                const cleanToken = tokens[i].replace(/[A-Za-z€$]/g, '');
                if (/^[\d.]+$/.test(cleanToken)) {
                    const parsed = parseFloat(cleanToken);
                    if (!isNaN(parsed) && cleanToken.length > 0) {
                        numTokens.push({ val: parsed, index: i });
                    }
                }
            }

            let parsedItem = false;

            // If we have numbers at the end (likely a table row: Qty PU Remise Montant)
            if (numTokens.length >= 2) {
                let qty = 1;
                let price = 0;
                let firstNumIndex = tokens.length;

                if (numTokens.length >= 4) {
                    qty = numTokens[numTokens.length - 4].val;
                    price = numTokens[numTokens.length - 3].val;
                    firstNumIndex = numTokens[numTokens.length - 4].index;
                } else if (numTokens.length === 3) {
                    qty = numTokens[numTokens.length - 3].val;
                    price = numTokens[numTokens.length - 2].val;
                    firstNumIndex = numTokens[numTokens.length - 3].index;
                } else if (numTokens.length === 2) {
                    qty = numTokens[numTokens.length - 2].val;
                    price = numTokens[numTokens.length - 1].val;
                    firstNumIndex = numTokens[numTokens.length - 2].index;
                    // If qty is too large or not integer, it might be Price and Total
                    if (qty > 1000 || !Number.isInteger(qty)) {
                        price = Math.max(qty, price); // Assume the larger is the total, smaller or equal is PU. We want PU. If both are same, any is fine. Wait, if it's PU and Total: PU is generally smaller.
                        if (qty > price && price > 0) { price = price; /* keep it */ }
                        else if (qty > 0 && price >= qty) { price = qty; } // Wait, let's just use the first as PU
                        price = qty; // Fallback: first number is price
                        qty = 1;
                    }
                }

                if (price > 0 && firstNumIndex > 0) {
                    const nameTokens = tokens.slice(0, firstNumIndex);

                    // Sometimes the first token is an index (1, 2, 3...)
                    if (nameTokens.length > 0 && /^\d+$/.test(nameTokens[0])) {
                        nameTokens.shift();
                    }

                    let namePart = nameTokens.join(" ").trim();
                    namePart = namePart.replace(/^[.*\-:]+/, '').replace(/[.*\-:]+$/, '').trim();

                    if (namePart.length > 0 || currentNameBuffer.length > 0) {
                        const fullName = [...currentNameBuffer, namePart].filter(Boolean).join(" ");
                        // Only add if fullName has length
                        if (fullName.length > 2) {
                            items.push({ name: fullName, price, quantity: qty });
                            parsedItem = true;
                            currentNameBuffer = []; // reset buffer
                        }
                    }
                }
            }

            if (!parsedItem) {
                // Fallback to regex parser for simpler formats (e.g. "Pizza x2 1500 DA")
                const priceRegex = /(\d+[.,\s]*\d*)\s*(DA|DZD|€|\$)?/i;
                const qtyRegex = /(?:^|\s)(\d+)\s*(?:x|\*|qte|pieces)/i;

                const priceMatch = line.match(priceRegex);
                if (priceMatch) {
                    const rawPrice = priceMatch[1].replace(/\s/g, '').replace(',', '.');
                    const price = parseFloat(rawPrice);

                    if (!isNaN(price) && price > 0) {
                        let quantity = 1;
                        const qtyMatch = line.match(qtyRegex);
                        if (qtyMatch) {
                            quantity = parseInt(qtyMatch[1], 10) || 1;
                        }

                        let namePart = line.replace(priceMatch[0], '').replace(qtyMatch ? qtyMatch[0] : '', '').trim();
                        namePart = namePart.replace(/^[.*\-:]+/, '').replace(/[.*\-:]+$/, '').trim();

                        if (namePart.length > 0 || currentNameBuffer.length > 0) {
                            const fullName = [...currentNameBuffer, namePart].filter(Boolean).join(" ");
                            if (fullName.length > 2) {
                                items.push({ name: fullName, price, quantity });
                                parsedItem = true;
                                currentNameBuffer = [];
                            }
                        }
                    }
                }
            }

            if (!parsedItem) {
                // Might be part of a multi-line product name
                // Only add if it doesn't look like garbage and has some letters
                if (line.length > 2 && /[a-zA-Z]/.test(line)) {
                    // remove leading digits which might be row index
                    let cleanLine = line.replace(/^\d+[\s.]*/, '').trim();
                    if (cleanLine.length > 0) {
                        currentNameBuffer.push(cleanLine);
                    }
                }
            }
        }

        return items;
    }


    return (
        <div className="bg-muted/30 border rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-4">
            {!image ? (
                <>
                    <div className="flex justify-center mb-2">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Scanner un bon d'achat</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            Prenez une photo de votre facture ou importez une image pour extraire automatiquement les articles.
                        </p>
                    </div>
                    <div className="flex gap-3 mt-2">
                        <Button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={disabled || isProcessing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            Prendre une photo
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled || isProcessing}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Importer
                        </Button>
                    </div>
                </>
            ) : (
                <div className="w-full max-w-md space-y-4">
                    <div className="relative h-48 w-full rounded-md overflow-hidden border bg-black/5">
                        <Image src={image} alt="Receipt" fill className="object-cover opacity-60" />
                        {isProcessing ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                                <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                                <p className="font-medium text-sm">{statusText}</p>
                                <div className="w-2/3 mt-3">
                                    <Progress value={progress} className="h-2" />
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/20 backdrop-blur-sm">
                                <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-2" />
                                <p className="font-bold text-emerald-700">Analyse terminée</p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-4 bg-white/80 hover:bg-white"
                                    onClick={() => setImage(null)}
                                >
                                    Scanner un autre document
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                className="hidden"
                onChange={handleFileChange}
            />
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    )
}
