"use client"

import * as z from "zod"
import { useState, useEffect, useRef } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useReactToPrint } from "react-to-print"
import { Trash, Plus, Printer, CheckCircle, TruckIcon, FileText, Package, Sparkles, FileSpreadsheet, Percent, Info, ZoomIn, TrendingUp, Sliders, Clipboard, Eye, Wand2, Star, Archive, DollarSign, ShoppingCart, Store, Users as UsersIcon, Barcode, Tag, Wallet, CreditCard, Coins, MessageSquare } from "lucide-react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/routing"
import { toast } from "react-hot-toast"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductSearchCombobox } from "@/components/ui/product-search-combobox"
import {
    createPurchaseOrder,
    updatePurchaseOrder,
    updatePurchaseOrderStatus,
    deletePurchaseOrder,
    createSupplierPayment
} from "@/actions/purchase-orders"
import { createProduct, updateProductPrices, suggestProductNames } from "@/actions/products"
import { createCategory } from "@/actions/categories"
import { createBrand } from "@/actions/brands"
import { createSupplier } from "@/actions/suppliers"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { OcrReceiptUploader } from "./ocr-receipt-uploader"
import { MissingProductsForm } from "./missing-products-form"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/ui/image-upload"
import { Checkbox } from "@/components/ui/checkbox"
import { generateNextBarcode } from "@/actions/barcode"

const formSchema = z.object({
    supplierId: z.string().min(1, "Fournisseur requis"),
    accountId: z.string().optional(),
    status: z.enum(["PENDING", "BON_COMMANDE", "BON_LIVRAISON", "FACTURE", "COMPLETED", "CANCELLED"]),
    notes: z.string().optional(),
    imageUrl1: z.string().optional(),
    imageUrl2: z.string().optional(),
    imageUrl3: z.string().optional(),
    createdAt: z.string().optional(),
    items: z.array(z.object({
        productId: z.string().min(1, "Produit requis"),
        quantity: z.number().min(1),
        costPrice: z.number().min(0),
        tvaRate: z.number().optional(),
        serialNumber: z.string().optional()
    })).min(1, "Ajoutez au moins un article"),
    reference: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

interface PurchaseOrderFormProps {
    initialData: any | null
    payments?: any[]
    suppliers: any[]
    products: any[]
    categories: any[]
    brands: any[]
    accounts: any[]
    storeData?: any
}

const STATUS_CONFIG = {
    PENDING: { label: "Brouillon", color: "bg-gray-100 text-gray-700", icon: Package },
    BON_COMMANDE: { label: "Bon de Commande", color: "bg-blue-100 text-blue-700", icon: FileText },
    BON_LIVRAISON: { label: "Bon de Réception", color: "bg-amber-100 text-amber-700", icon: TruckIcon },
    FACTURE: { label: "Facture", color: "bg-purple-100 text-purple-700", icon: FileText },
    COMPLETED: { label: "Payé ✓", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
    CANCELLED: { label: "Annulé", color: "bg-red-100 text-red-700", icon: Trash },
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
    initialData,
    payments = [],
    suppliers,
    products,
    categories,
    brands,
    accounts,
    storeData
}) => {
    const params = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const isElectronics = storeData?.isElectronics || storeData?.name?.toLowerCase().includes("electr") || false;
    const tvaEnabled = storeData?.tvaEnabled ?? false;
    const [ocrItems, setOcrItems] = useState<{ name: string, price: number, quantity: number }[]>([])
    const [supplierModalOpen, setSupplierModalOpen] = useState(false)
    const [newSupplierName, setNewSupplierName] = useState("")
    const [newSupplierPhone, setNewSupplierPhone] = useState("")
    const printRef = useRef<HTMLDivElement>(null)

    const [localProducts, setLocalProducts] = useState(products)
    const [localSuppliers, setLocalSuppliers] = useState<any[]>(suppliers || [])
    const [localCategories, setLocalCategories] = useState<any[]>(categories || [])
    const [localBrands, setLocalBrands] = useState<any[]>(brands || [])
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
    const [showNewBrandInput, setShowNewBrandInput] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState("")
    const [newBrandName, setNewBrandName] = useState("")
    const [creatingCat, setCreatingCat] = useState(false)
    const [creatingBrand, setCreatingBrand] = useState(false)

    useEffect(() => {
        setLocalProducts(products)
    }, [products])

    useEffect(() => {
        setLocalSuppliers(suppliers || [])
    }, [suppliers])

    useEffect(() => {
        setLocalCategories(categories || [])
    }, [categories])

    useEffect(() => {
        setLocalBrands(brands || [])
    }, [brands])

    // Initial Payment State on Creation
    const [payImmediately, setPayImmediately] = useState(false)
    const [initialPayAmount, setInitialPayAmount] = useState(0)
    const [initialPayMethod, setInitialPayMethod] = useState("CASH")
    const [initialPayAccountId, setInitialPayAccountId] = useState(accounts[0]?.id || "")
    const [initialPayNotes, setInitialPayNotes] = useState("")

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return
        try {
            setCreatingCat(true)
            const result = await createCategory({ name: newCategoryName.trim() })
            if (result.error) {
                toast.error(result.error)
            } else if (result.data) {
                toast.success("Catégorie créée avec succès !")
                setLocalCategories(prev => [...prev, result.data])
                setQuickCategoryId(result.data.id)
                setShowNewCategoryInput(false)
                router.refresh()
            }
        } catch {
            toast.error("Erreur de création de la catégorie")
        } finally {
            setCreatingCat(false)
        }
    }

    const handleCreateBrand = async () => {
        if (!newBrandName.trim()) return
        try {
            setCreatingBrand(true)
            const result = await createBrand({ name: newBrandName.trim() })
            if (result.error) {
                toast.error(result.error)
            } else if (result.data) {
                toast.success("Marque créée avec succès !")
                setLocalBrands(prev => [...prev, result.data])
                setQuickBrandId(result.data.id)
                setShowNewBrandInput(false)
                router.refresh()
            }
        } catch {
            toast.error("Erreur de création de la marque")
        } finally {
            setCreatingBrand(false)
        }
    }

    // Quick Product Dialog State (Matching full product sheet)
    const [quickProductOpen, setQuickProductOpen] = useState(false)
    const [quickProductRowIndex, setQuickProductRowIndex] = useState<number | null>(null)
    const [quickTab, setQuickTab] = useState<"general" | "pricing" | "barcodes" | "stock">("general")
    const [quickName, setQuickName] = useState("")
    const [quickSuggestions, setQuickSuggestions] = useState<string[]>([])
    const [showQuickSuggestions, setShowQuickSuggestions] = useState(false)
    const [focusedQuickSuggestionIndex, setFocusedQuickSuggestionIndex] = useState(-1)
    const [quickDescription, setQuickDescription] = useState("")
    const [quickCategoryId, setQuickCategoryId] = useState("")
    const [quickBrandId, setQuickBrandId] = useState("")
    
    // Pricing
    const [quickCost, setQuickCost] = useState(0)
    const [quickPrice, setQuickPrice] = useState(0)
    const [quickWholesalePrice, setQuickWholesalePrice] = useState(0)
    const [quickDealerPrice, setQuickDealerPrice] = useState(0)
    const [quickTva, setQuickTva] = useState(19)
    
    // Barcodes
    const [quickBarcodes, setQuickBarcodes] = useState<{ value: string; label: string }[]>([])
    
    // Images
    const [quickImages, setQuickImages] = useState<{ url: string }[]>([])
    
    // Stock & Status
    const [quickStock, setQuickStock] = useState(0)
    const [quickMinStock, setQuickMinStock] = useState(0)
    const [quickIsFeatured, setQuickIsFeatured] = useState(false)
    const [quickIsArchived, setQuickIsArchived] = useState(false)

    // PMP Live Calculator Dialog State
    const [pmpOpen, setPmpOpen] = useState(false)
    const [pmpRowIndex, setPmpRowIndex] = useState<number | null>(null)
    const [pmpRetailMargin, setPmpRetailMargin] = useState(30)
    const [pmpDealerMargin, setPmpDealerMargin] = useState(20)
    const [pmpWholesaleMargin, setPmpWholesaleMargin] = useState(15)
    const [pmpRetailPrice, setPmpRetailPrice] = useState(0)
    const [pmpDealerPrice, setPmpDealerPrice] = useState(0)
    const [pmpWholesalePrice, setPmpWholesalePrice] = useState(0)

    // Clipboard Paste Importer State
    const [clipboardOpen, setClipboardOpen] = useState(false)
    const [clipboardText, setClipboardText] = useState("")

    // Lightbox State
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

    // Delete Form State
    const [deleteFormOpen, setDeleteFormOpen] = useState(false)
    const [deleteFormPassword, setDeleteFormPassword] = useState("")

    // Partial Supplier Payment State
    const [localPayments, setLocalPayments] = useState<any[]>(payments)
    const [payModalOpen, setPayModalOpen] = useState(false)
    const [payAmount, setPayAmount] = useState(0)
    const [payMethod, setPayMethod] = useState("Espèce")
    const [payAccountId, setPayAccountId] = useState("")
    const [payNotes, setPayNotes] = useState("")

    const handleRegisterPayment = async () => {
        if (!initialData?.id) return
        if (payAmount <= 0) {
            toast.error("Veuillez saisir un montant valide supérieur à 0")
            return
        }
        if (!payAccountId) {
            toast.error("Veuillez sélectionner un compte de trésorerie")
            return
        }
        
        try {
            setLoading(true)
            const result = await createSupplierPayment({
                purchaseOrderId: initialData.id,
                accountId: payAccountId,
                amount: payAmount,
                paymentMethod: payMethod,
                notes: payNotes
            })
            
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Règlement enregistré avec succès !")
                if (result.transaction) {
                    setLocalPayments(prev => [result.transaction, ...prev])
                }
                setPayModalOpen(false)
                setPayAmount(0)
                setPayNotes("")
                router.refresh()
            }
        } catch {
            toast.error("Erreur lors de l'enregistrement du règlement")
        } finally {
            setLoading(false)
        }
    }

    const handleFormDelete = async () => {
        if (!initialData?.id) return
        if (deleteFormPassword !== "111") {
            toast.error("Mot de passe incorrect !")
            return
        }
        try {
            setLoading(true)
            const result = await deletePurchaseOrder(initialData.id)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Bon d'achat supprimé avec succès.")
                setDeleteFormOpen(false)
                setDeleteFormPassword("")
                router.push("/purchases")
                router.refresh()
            }
        } catch {
            toast.error("Une erreur est survenue lors de la suppression.")
        } finally {
            setLoading(false)
        }
    }

    // Quick margin/cost calculations
    const handleQuickCostChange = (val: number) => {
        setQuickCost(val)
        if (val > 0) {
            setQuickPrice(Number((val * 1.30).toFixed(2)))
            setQuickWholesalePrice(Number((val * 1.15).toFixed(2)))
            setQuickDealerPrice(Number((val * 1.20).toFixed(2)))
        } else {
            setQuickPrice(0)
            setQuickWholesalePrice(0)
            setQuickDealerPrice(0)
        }
    }

    const handleGenerateQuickBarcode = async () => {
        try {
            setLoading(true)
            const res = await generateNextBarcode()
            if (res.success && res.barcode) {
                setQuickBarcodes(prev => [...prev, { value: res.barcode, label: "Principal" }])
                toast.success("Code-barre généré !")
            } else {
                toast.error("Erreur de génération.")
            }
        } catch {
            toast.error("Erreur lors de la génération.")
        } finally {
            setLoading(false)
        }
    }

    const handleOpenQuickProductModal = (rowIndex: number) => {
        setQuickProductRowIndex(rowIndex)
        setQuickTab("general")
        setQuickName("")
        setQuickDescription("")
        setQuickCategoryId(categories[0]?.id || "")
        setQuickBrandId(brands[0]?.id || "")
        setQuickCost(0)
        setQuickPrice(0)
        setQuickWholesalePrice(0)
        setQuickDealerPrice(0)
        setQuickTva(19)
        setQuickBarcodes([])
        setQuickImages([])
        setQuickStock(0)
        setQuickMinStock(0)
        setQuickIsFeatured(false)
        setQuickIsArchived(false)
        setQuickProductOpen(true)
    }

    const handleCreateQuickProduct = async () => {
        if (!quickName.trim() || !quickCategoryId || !quickBrandId) {
            toast.error("Veuillez remplir les champs obligatoires (*)")
            return
        }
        try {
            setLoading(true)
            const payload = {
                name: quickName,
                description: quickDescription || "",
                price: quickPrice || 0,
                cost: quickCost || 0,
                wholesalePrice: quickWholesalePrice || 0,
                dealerPrice: quickDealerPrice || 0,
                categoryId: quickCategoryId,
                brandId: quickBrandId,
                tvaRate: quickTva,
                images: quickImages.map(img => ({ url: img.url })),
                stock: quickStock || 0,
                minStock: quickMinStock || 0,
                isFeatured: quickIsFeatured,
                isArchived: quickIsArchived,
                barcodes: quickBarcodes.map(b => ({ value: b.value, label: b.label || "" }))
            }
            const result = await createProduct(payload)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Produit créé et sélectionné !")
                const newProduct = result.product
                if (newProduct) {
                    setLocalProducts((prev) => [newProduct, ...prev])
                    if (quickProductRowIndex !== null) {
                        form.setValue(`items.${quickProductRowIndex}.productId`, newProduct.id)
                        form.setValue(`items.${quickProductRowIndex}.costPrice`, quickCost)
                    }
                }
                setQuickProductOpen(false)
                router.refresh()
            }
        } catch (err) {
            toast.error("Erreur de création du produit.")
        } finally {
            setLoading(false)
        }
    }

    const handleOpenPmpSuggester = (index: number) => {
        const prodId = watchItems[index]?.productId
        const activeProduct = localProducts.find(p => p.id === prodId)
        if (!activeProduct) return
        
        const oldStock = Number(activeProduct.stock || 0)
        const oldCost = Number(activeProduct.cost || 0)
        const newQty = Number(watchItems[index]?.quantity || 0)
        const newCost = Number(watchItems[index]?.costPrice || 0)
        
        const totalStock = oldStock + newQty
        const totalValue = (oldStock * oldCost) + (newQty * newCost)
        const calculatedPmp = totalStock > 0 ? (totalValue / totalStock) : newCost
        
        setPmpRowIndex(index)
        setPmpRetailMargin(30)
        setPmpDealerMargin(20)
        setPmpWholesaleMargin(15)
        setPmpRetailPrice(Number((calculatedPmp * 1.30).toFixed(2)))
        setPmpDealerPrice(Number((calculatedPmp * 1.20).toFixed(2)))
        setPmpWholesalePrice(Number((calculatedPmp * 1.15).toFixed(2)))
        setPmpOpen(true)
    }

    const handleApplyPmpPrices = async () => {
        if (pmpRowIndex === null) return
        const prodId = watchItems[pmpRowIndex]?.productId
        const activeProduct = localProducts.find(p => p.id === prodId)
        if (!activeProduct) return
        
        const oldStock = Number(activeProduct.stock || 0)
        const oldCost = Number(activeProduct.cost || 0)
        const newQty = Number(watchItems[pmpRowIndex]?.quantity || 0)
        const newCost = Number(watchItems[pmpRowIndex]?.costPrice || 0)
        const totalStock = oldStock + newQty
        const totalValue = (oldStock * oldCost) + (newQty * newCost)
        const calculatedPmp = totalStock > 0 ? (totalValue / totalStock) : newCost

        try {
            setLoading(true)
            const prices = {
                cost: Number(calculatedPmp.toFixed(2)),
                price: pmpRetailPrice,
                wholesalePrice: pmpWholesalePrice,
                dealerPrice: pmpDealerPrice
            }
            
            const result = await updateProductPrices(activeProduct.id, prices)
            
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Prix de vente et coût PMP mis à jour avec succès !")
                
                setLocalProducts((prev) =>
                    prev.map((p) =>
                        p.id === activeProduct.id
                            ? {
                                  ...p,
                                  cost: prices.cost,
                                  price: prices.price,
                                  wholesalePrice: prices.wholesalePrice,
                                  dealerPrice: prices.dealerPrice
                              }
                            : p
                    )
                )
                
                setPmpOpen(false)
            }
        } catch (err) {
            toast.error("Erreur de mise à jour des prix.")
        } finally {
            setLoading(false)
        }
    }

    const handleImportClipboard = async () => {
        if (!clipboardText.trim()) return
        const rows = clipboardText.split("\n")
        const importedItems: any[] = []
        let missingCount = 0
        
        for (const row of rows) {
            if (!row.trim()) continue
            const cols = row.split("\t")
            if (cols.length < 2) continue
            
            const nameOrBarcode = cols[0].trim()
            const qty = Number(cols[1]) || 1
            const cost = Number(cols[2]) || 0
            
            const match = localProducts.find(p =>
                p.name.toLowerCase() === nameOrBarcode.toLowerCase() ||
                p.barcodes?.some(b => b.value === nameOrBarcode)
            )
            
            if (match) {
                importedItems.push({
                    productId: match.id,
                    quantity: qty,
                    costPrice: cost || Number(match.cost || 0),
                    tvaRate: 0
                })
            } else {
                missingCount++
            }
        }
        
        if (importedItems.length > 0) {
            const currentItems = form.getValues("items")
            const cleanCurrent = (currentItems.length === 1 && !currentItems[0].productId) ? [] : currentItems
            form.setValue("items", [...importedItems, ...cleanCurrent])
            toast.success(`${importedItems.length} articles importés avec succès !`)
            setClipboardText("")
            setClipboardOpen(false)
        }
        
        if (missingCount > 0) {
            toast.error(`${missingCount} articles non trouvés dans votre catalogue.`)
        }
    }

    const isEditMode = !!initialData
    const canEdit = true

    useEffect(() => {
        if (isEditMode && payments && payments.length > 0) {
            const firstPay = payments[0]
            setPayImmediately(true)
            setInitialPayAmount(Number(firstPay.amount))
            setInitialPayAccountId(firstPay.accountId)
            
            // Extract method
            const methodMatch = firstPay.description?.match(/\[(.*?)\]/)?.[1]
            if (methodMatch) {
                const mappedMethod = methodMatch.toUpperCase()
                if (["CASH", "VERSEMENT", "VIREMENT", "CHEQUE", "CARTE"].includes(mappedMethod)) {
                    setInitialPayMethod(mappedMethod)
                } else if (methodMatch === "Espèce" || methodMatch === "Espece") {
                    setInitialPayMethod("CASH")
                } else {
                    setInitialPayMethod("CASH")
                }
            } else {
                setInitialPayMethod("CASH")
            }
            
            // Extract notes
            const notesParts = firstPay.description?.split(" - ")
            if (notesParts && notesParts.length > 1) {
                setInitialPayNotes(notesParts.slice(1).join(" - "))
            } else {
                setInitialPayNotes("")
            }
        }
    }, [isEditMode, payments])

    const title = isEditMode
        ? (initialData?.purchaseNumber || `Bon #${initialData?.id?.slice(-8).toUpperCase()}`)
        : "Nouveau bon d'achat"
    const currentStatus = initialData?.status || "PENDING"
    const statusConf = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            supplierId: initialData.supplierId,
            accountId: initialData.accountId || "none",
            status: initialData.status,
            notes: initialData.notes || "",
            imageUrl1: initialData.imageUrl1 || "",
            imageUrl2: initialData.imageUrl2 || "",
            imageUrl3: initialData.imageUrl3 || "",
            createdAt: initialData.createdAt ? new Date(initialData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            items: initialData.items.map((item: any) => ({
                productId: item.productId,
                quantity: Number(item.quantity),
                costPrice: Number(item.costPrice),
                tvaRate: Number(item.tvaRate ?? 0),
                serialNumber: item.serialNumber || ""
            })),
            reference: initialData.reference || ""
        } : {
            supplierId: "",
            accountId: "none",
            status: "BON_LIVRAISON",
            notes: "",
            imageUrl1: "",
            imageUrl2: "",
            imageUrl3: "",
            reference: "",
            createdAt: new Date().toISOString().split('T')[0],
            items: [{ productId: "", quantity: 1, costPrice: 0, tvaRate: 0, serialNumber: "" }]
        }
    })

    const { fields, prepend, remove } = useFieldArray({ control: form.control, name: "items" })

    const watchItems = form.watch("items")
    const watchSupplierId = form.watch("supplierId")
    const selectedSupplier = localSuppliers.find(s => s.id === watchSupplierId)

    const total = watchItems.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0)

    const combineDateWithCurrentTime = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
        return d
    }

    const onSubmit = async (values: FormValues) => {
        try {
            setLoading(true)
            if (!isEditMode) {
                const payload = {
                    ...values,
                    total,
                    createdAt: values.createdAt ? combineDateWithCurrentTime(values.createdAt) : undefined,
                    paymentAmount: payImmediately ? initialPayAmount : 0,
                    paymentMethod: payImmediately ? initialPayMethod : "CASH",
                    paymentAccountId: payImmediately ? initialPayAccountId : undefined,
                    paymentNotes: payImmediately ? initialPayNotes : undefined
                }
                const result = await createPurchaseOrder(payload)
                if (result?.error) { toast.error(result.error); return }
                toast.success("Bon créé avec succès.")
                router.push(`/purchases`)
                router.refresh()
            } else {
                const payload = {
                    ...values,
                    total,
                    createdAt: values.createdAt ? combineDateWithCurrentTime(values.createdAt) : undefined,
                    paymentAmount: payImmediately ? initialPayAmount : 0,
                    paymentMethod: payImmediately ? initialPayMethod : "CASH",
                    paymentAccountId: payImmediately ? initialPayAccountId : undefined,
                    paymentNotes: payImmediately ? initialPayNotes : undefined
                }
                const result = await updatePurchaseOrder(initialData.id, payload)
                if (result?.error) { toast.error(result.error); return }
                toast.success("Bon modifié.")
                router.refresh()
            }
        } catch { toast.error("Une erreur est survenue.") }
        finally { setLoading(false) }
    }

    const handleStatusChange = async (newStatus: string, accountId?: string) => {
        if (!initialData) return
        try {
            setLoading(true)
            const result = await updatePurchaseOrderStatus(initialData.id, newStatus, accountId)
            if (result?.error) { toast.error(result.error); return }
            toast.success(result.success || "Statut mis à jour.")
            router.refresh()
            window.location.reload()
        } catch { toast.error("Erreur lors de la mise à jour.") }
        finally { setLoading(false) }
    }

    const handleCreateSupplier = async () => {
        if (!newSupplierName.trim()) return;
        try {
            setLoading(true)
            const result = await createSupplier({
                name: newSupplierName,
                phone: newSupplierPhone
            })
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Fournisseur créé")
                setSupplierModalOpen(false)
                if (result.id) {
                    const newSupplier = {
                        id: result.id,
                        name: newSupplierName,
                        phone: newSupplierPhone
                    }
                    setLocalSuppliers(prev => [newSupplier, ...prev])
                    form.setValue("supplierId", result.id)
                }
                setNewSupplierName("")
                setNewSupplierPhone("")
                router.refresh()
            }
        } catch (error) {
            toast.error("Une erreur est survenue.")
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = useReactToPrint({
        contentRef: printRef,
    })

    // Keyboard: Insert key = add item
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Insert" && ocrItems.length === 0) {
                e.preventDefault()
                prepend({ productId: "", quantity: 1, costPrice: 0, tvaRate: 0 })
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [prepend, ocrItems.length])

    const handleOcrExtracted = (items: { name: string, price: number, quantity: number }[], supplierName?: string) => {
        setOcrItems(items)
        // Auto-select supplier if Gemini detected one
        if (supplierName && supplierName.trim()) {
            const lower = supplierName.trim().toLowerCase()
            const match = localSuppliers.find(s =>
                s.name.toLowerCase() === lower ||
                s.name.toLowerCase().includes(lower) ||
                lower.includes(s.name.toLowerCase())
            )
            if (match) {
                form.setValue("supplierId", match.id)
            }
        }
    }

    const handleMissingProductsComplete = (matchedItems: { productId: string, quantity: number, costPrice: number }[]) => {
        // Append all the matched/new items to the form
        const currentItems = form.getValues("items")

        // Remove the empty default row if it's the only one and empty
        const itemsToSet = (currentItems.length === 1 && !currentItems[0].productId)
            ? matchedItems
            : [...matchedItems, ...currentItems]

        form.setValue("items", itemsToSet)
        setOcrItems([]) // close the OCR flow
    }

    return (
        <>
            {/* ── Print-only layout ─────────────────────────────────────── */}
            <div className="hidden print:block p-8 text-sm" ref={printRef}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">{statusConf.label}</h1>
                        <p className="text-gray-500">Réf: {initialData?.purchaseNumber || `#${initialData?.id?.slice(-8).toUpperCase()}`}</p>
                        <p className="text-gray-500">Date: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg">SYNCLOUD POS</p>
                        <p className="text-sm text-gray-600">Fournisseur:<br />{selectedSupplier?.name}</p>
                    </div>
                </div>
                <table className="w-full border-collapse border border-gray-300 mb-6">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-gray-300 p-2 text-left">Produit</th>
                            <th className="border border-gray-300 p-2 text-right">Qté</th>
                            <th className="border border-gray-300 p-2 text-right">P.U (DA)</th>
                            <th className="border border-gray-300 p-2 text-right">Total (DA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(initialData?.items || []).map((item: any, i: number) => (
                            <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50"}>
                                <td className="border border-gray-300 p-2">{item.product?.name}</td>
                                <td className="border border-gray-300 p-2 text-right">{item.quantity}</td>
                                <td className="border border-gray-300 p-2 text-right">{Number(item.costPrice).toLocaleString()}</td>
                                <td className="border border-gray-300 p-2 text-right font-semibold">{(Number(item.costPrice) * item.quantity).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold bg-gray-100">
                            <td colSpan={3} className="border border-gray-300 p-2 text-right">TOTAL</td>
                            <td className="border border-gray-300 p-2 text-right">{Number(initialData?.total || 0).toLocaleString()} DA</td>
                        </tr>
                    </tfoot>
                </table>
                <div className="flex justify-between mt-8">
                    <div className="text-center">
                        <p className="font-semibold mb-8">Signature Fournisseur</p>
                        <div className="border-t border-gray-400 w-40"></div>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold mb-8">Signature Responsable</p>
                        <div className="border-t border-gray-400 w-40"></div>
                    </div>
                </div>
            </div>

            {/* ── Screen UI ─────────────────────────────────────────────── */}
            <div className="print:hidden">
                <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nouveau Fournisseur</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nom *</label>
                                <Input disabled={loading} placeholder="Nom du fournisseur" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Téléphone</label>
                                <Input disabled={loading} placeholder="Téléphone" value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button disabled={loading || !newSupplierName.trim()} onClick={handleCreateSupplier}>
                                Créer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Heading title={title} description={isEditMode ? `Fournisseur: ${initialData?.supplier?.name}` : "Créer un bon d'achat"} />
                        {isEditMode && (
                            <Badge className={cn("text-xs px-2.5 py-1 font-semibold", statusConf.color)}>
                                {statusConf.label}
                            </Badge>
                        )}
                    </div>
                    {/* Action buttons for existing orders */}
                    {isEditMode && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="h-4 w-4 mr-1.5" /> Imprimer
                            </Button>
                            {currentStatus === "PENDING" || currentStatus === "BON_COMMANDE" ? (
                                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={loading}
                                    onClick={() => handleStatusChange("BON_LIVRAISON")}>
                                    <TruckIcon className="h-4 w-4 mr-1.5" /> Valider la Réception (BR)
                                </Button>
                            ) : null}
                            {currentStatus === "BON_LIVRAISON" && (
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={loading}
                                    onClick={() => handleStatusChange("FACTURE")}>
                                    <FileText className="h-4 w-4 mr-1.5" /> Créer Facture
                                </Button>
                            )}
                            {currentStatus === "FACTURE" && (
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}
                                    onClick={() => {
                                        const accId = form.getValues("accountId")
                                        handleStatusChange("COMPLETED", accId)
                                    }}>
                                    <CheckCircle className="h-4 w-4 mr-1.5" /> Marquer Payé
                                </Button>
                            )}
                            <Button variant="destructive" size="sm" disabled={loading} onClick={() => setDeleteFormOpen(true)}>
                                <Trash className="h-4 w-4 mr-1.5" /> Supprimer
                            </Button>
                        </div>
                    )}
                </div>
                <Separator className="my-4" />

                {/* Supplier info card (view mode) */}
                {isEditMode && selectedSupplier && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 p-4 bg-muted/20 rounded-lg border">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Fournisseur</p>
                            <p className="font-bold text-base">{selectedSupplier.name}</p>
                            {selectedSupplier.phone && <p className="text-sm text-muted-foreground">{selectedSupplier.phone}</p>}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Solde dû</p>
                            <p className={cn("text-2xl font-bold", Number(selectedSupplier.balance ?? 0) > 0 ? "text-red-600" : "text-emerald-600")}>
                                {Number(selectedSupplier.balance ?? 0).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-0.5">Total bon</p>
                            <p className="text-3xl font-bold">{Number(initialData?.total || 0).toLocaleString()} DA</p>
                        </div>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Top fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <FormField control={form.control} name="supplierId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fournisseur</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <SearchableSelect
                                                options={localSuppliers.map(s => ({ value: s.id, label: s.name }))}
                                                value={field.value}
                                                onChange={field.onChange}
                                                disabled={loading || !canEdit}
                                                placeholder="Sélectionner un fournisseur..."
                                                searchPlaceholder="Rechercher un fournisseur..."
                                            />
                                        </div>
                                        {canEdit && (
                                            <Button type="button" variant="outline" size="icon" onClick={() => setSupplierModalOpen(true)} disabled={loading} className="shrink-0">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type de document</FormLabel>
                                    <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="BON_LIVRAISON">Bon de Réception (BR) (+Stock)</SelectItem>
                                            <SelectItem value="BON_COMMANDE">Bon de Commande</SelectItem>
                                            <SelectItem value="FACTURE">Facture</SelectItem>
                                            <SelectItem value="PENDING">Brouillon</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="accountId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Compte de paiement</FormLabel>
                                    <SearchableSelect
                                        options={[
                                            { value: "none", label: "Aucun / À régler" },
                                            ...accounts.map(a => ({ value: a.id, label: `${a.name} — ${a.balance}` }))
                                        ]}
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={loading}
                                        placeholder="Sélectionner un compte..."
                                        searchPlaceholder="Rechercher un compte..."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="reference" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Réf. Fournisseur (Facture/BL)</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading || !canEdit} placeholder="Ex: FAC-2024-001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="createdAt" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date de transaction</FormLabel>
                                    <FormControl>
                                        <Input disabled={loading} type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <Separator />

                        {ocrItems.length > 0 ? (
                            <div className="space-y-4">
                                <MissingProductsForm
                                    scannedItems={ocrItems}
                                    existingProducts={products}
                                    categories={categories}
                                    brands={brands}
                                    onComplete={handleMissingProductsComplete}
                                />
                            </div>
                        ) : (
                            <>
                                {/* OCR Entry Point */}
                                {canEdit && (
                                    <div className="mb-6">
                                        <OcrReceiptUploader onProductsExtracted={handleOcrExtracted} disabled={loading} />
                                    </div>
                                )}

                                {/* Items */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base font-semibold flex items-center gap-2">
                                            <Package className="h-4 w-4" /> Articles
                                            <Badge variant="outline">{fields.length}</Badge>
                                        </h3>
                                        {canEdit && (
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => setClipboardOpen(!clipboardOpen)} className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all font-semibold">
                                                    <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Import Excel/Coller
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => prepend({ productId: "", quantity: 1, costPrice: 0 })}>
                                                    <Plus className="h-4 w-4 mr-1.5" /> Ajouter (Insert)
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {clipboardOpen && (
                                        <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/5 border border-emerald-500/20 dark:border-emerald-500/30 p-5 space-y-4 rounded-2xl shadow-xl backdrop-blur-md transition-all duration-300">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1.5">
                                                    <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                                        <Clipboard className="h-4.5 w-4.5 text-emerald-600" />
                                                        Importateur depuis le Presse-papiers Excel
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                                                        Copiez vos lignes depuis Excel (Colonnes dans l'ordre : <span className="font-semibold text-emerald-600 dark:text-emerald-400">Nom du produit ou Code-barre</span>, <span className="font-semibold text-emerald-600 dark:text-emerald-400">Quantité</span>, <span className="font-semibold text-emerald-600 dark:text-emerald-400">Prix d'achat unitaire</span>) puis collez-les ci-dessous.
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-3 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                                                    onClick={() => setClipboardOpen(false)}
                                                >
                                                    Fermer
                                                </Button>
                                            </div>
                                            <Textarea
                                                placeholder="Exemple de ligne à coller :&#10;Coca Cola 33cl	12	80&#10;789456123	24	120"
                                                className="font-mono text-xs h-28 bg-background/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 shadow-sm resize-none rounded-xl"
                                                value={clipboardText}
                                                onChange={e => setClipboardText(e.target.value)}
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white w-full sm:w-auto font-semibold shadow-md hover:shadow-emerald-500/10 transition-all rounded-xl"
                                                onClick={handleImportClipboard}
                                                disabled={!clipboardText.trim()}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-2" /> Analyser et Insérer les lignes
                                            </Button>
                                        </Card>
                                    )}

                                    {/* Unified Premium Table Card */}
                                    <Card className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                            {/* Column headers (Desktop only) */}
                                            <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider items-center border-b border-slate-100 dark:border-slate-800">
                                                <div className="col-span-4">Produit</div>
                                                <div className="col-span-2 text-center">Quantité</div>
                                                <div className={cn("text-left", storeData?.tvaEnabled ? "col-span-2" : "col-span-4")}>
                                                    {storeData?.tvaEnabled ? "Prix U. HT (DA)" : "Prix U. (DA)"}
                                                </div>
                                                {storeData?.tvaEnabled && <div className="col-span-2 text-center">TVA</div>}
                                                <div className="col-span-1 text-right">
                                                    {storeData?.tvaEnabled ? "Total HT" : "Total"}
                                                </div>
                                                <div className="col-span-1"></div>
                                            </div>
                                            {fields.map((field, index) => {
                                                const lineTotal = (watchItems[index]?.quantity || 0) * (watchItems[index]?.costPrice || 0)
                                                return (
                                                    <div 
                                                        key={field.id} 
                                                        className="grid grid-cols-12 gap-3 px-4 py-4 md:px-5 md:py-3.5 items-center hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors"
                                                    >
                                                        {/* Product Search */}
                                                        <div className="col-span-12 md:col-span-4 min-w-0 flex flex-col gap-1.5">
                                                            <FormField control={form.control} name={`items.${index}.productId`} render={({ field: f }) => (
                                                                <FormItem className="m-0 space-y-0">
                                                                    <FormControl>
                                                                        <div className="flex items-center gap-1.5 w-full">
                                                                            <div className="flex-1 min-w-0">
                                                                                <ProductSearchCombobox
                                                                                    products={localProducts}
                                                                                    value={f.value}
                                                                                    onChange={f.onChange}
                                                                                    disabled={loading || !canEdit}
                                                                                    placeholder="Rechercher par nom, code, code-barre..."
                                                                                    priceField="cost"
                                                                                    onPriceSelect={price => form.setValue(`items.${index}.costPrice`, price)}
                                                                                />
                                                                            </div>
                                                                            {canEdit && (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    size="icon"
                                                                                    className="h-9 w-9 shrink-0 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl"
                                                                                    onClick={() => handleOpenQuickProductModal(index)}
                                                                                    title="Créer rapidement un nouveau produit"
                                                                                >
                                                                                    <Plus className="h-4 w-4 text-slate-500" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                            {isElectronics && (
                                                                <FormField control={form.control} name={`items.${index}.serialNumber`} render={({ field: f }) => (
                                                                    <FormItem className="m-0 space-y-0">
                                                                        <FormControl>
                                                                            <div className="relative flex items-center">
                                                                                <span className="absolute left-2.5 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">S/N</span>
                                                                                <Input
                                                                                    type="text"
                                                                                    placeholder="Numéros de série (S/N séparés par virgule)..."
                                                                                    className="pl-8 text-xs font-mono h-7 border-slate-150 focus-visible:ring-indigo-500 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg"
                                                                                    disabled={loading || !canEdit}
                                                                                    {...f}
                                                                                />
                                                                            </div>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )} />
                                                            )}
                                                        </div>

                                                        {/* Quantity */}
                                                        <div className="col-span-4 md:col-span-2">
                                                            <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => (
                                                                <FormItem className="m-0 space-y-0">
                                                                    <FormControl>
                                                                        <Input 
                                                                            type="number" 
                                                                            min={1} 
                                                                            disabled={loading || !canEdit} 
                                                                            className="font-bold text-sm h-9 text-center text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500 rounded-xl"
                                                                            {...f} 
                                                                            onChange={e => f.onChange(e.target.valueAsNumber || 1)} 
                                                                        />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )} />
                                                        </div>

                                                        {/* Unit Price with absolute Sparkle button */}
                                                        <div className={cn("col-span-4", storeData?.tvaEnabled ? "md:col-span-2" : "md:col-span-4")}>
                                                            <FormField control={form.control} name={`items.${index}.costPrice`} render={({ field: f }) => (
                                                                <FormItem className="m-0 space-y-0">
                                                                    <FormControl>
                                                                        <div className="relative flex items-center w-full">
                                                                            <Input 
                                                                                type="number" 
                                                                                step="0.01" 
                                                                                min={0} 
                                                                                disabled={loading || !canEdit}
                                                                                className="font-bold text-sm h-9 pr-9 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500 rounded-xl" 
                                                                                {...f} 
                                                                                onChange={e => f.onChange(e.target.valueAsNumber || 0)} 
                                                                            />
                                                                            {watchItems[index]?.productId && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleOpenPmpSuggester(index)}
                                                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 rounded transition-colors shrink-0"
                                                                                    title="Simuler PMP & Ajuster les Prix"
                                                                                >
                                                                                    <Sparkles className="h-4 w-4 animate-pulse" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </FormControl>
                                                                </FormItem>
                                                            )} />
                                                        </div>

                                                        {/* TVA */}
                                                        {storeData?.tvaEnabled && (
                                                            <div className="col-span-4 md:col-span-2">
                                                                <FormField control={form.control} name={`items.${index}.tvaRate`} render={({ field: f }) => {
                                                                    const isDisabled = loading || !canEdit;
                                                                    const val = f.value?.toString() ?? "0";
                                                                    return (
                                                                        <FormItem className="m-0 space-y-0">
                                                                            <Select disabled={isDisabled} onValueChange={(v) => f.onChange(Number(v))} value={val}>
                                                                                <FormControl>
                                                                                    <SelectTrigger className="font-bold h-9 border-slate-200 dark:border-slate-800 focus:ring-emerald-500 rounded-xl">
                                                                                        <SelectValue placeholder="TVA..." />
                                                                                    </SelectTrigger>
                                                                                </FormControl>
                                                                                <SelectContent>
                                                                                    <SelectItem value="19">19%</SelectItem>
                                                                                    <SelectItem value="9">9%</SelectItem>
                                                                                    <SelectItem value="0">0%</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </FormItem>
                                                                    );
                                                                }} />
                                                            </div>
                                                        )}

                                                        {/* Total Line (HT) */}
                                                        <div className="col-span-8 md:col-span-1 text-right">
                                                            <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                                                                {lineTotal.toLocaleString("fr-DZ")} <span className="text-[10px] font-bold text-slate-400">DA</span>
                                                            </span>
                                                        </div>

                                                        {/* Trash Action */}
                                                        <div className="col-span-4 md:col-span-1 flex justify-end">
                                                            {canEdit && (
                                                                <Button 
                                                                    type="button" 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                                                                    onClick={() => remove(index)} 
                                                                    disabled={fields.length === 1}
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </Card>
                                </div>

                                {/* Total + Withholding breakdown */}
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    {/* Quantities summary */}
                                    <div className="bg-muted/30 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 flex gap-6 text-sm w-full sm:w-auto">
                                        <div>
                                            <span className="text-muted-foreground block text-xs uppercase font-semibold">Produits uniques</span>
                                            <span className="font-bold text-lg">{fields.length}</span>
                                        </div>
                                        <div className="border-l border-slate-200 dark:border-slate-850 pl-6">
                                            <span className="text-muted-foreground block text-xs uppercase font-semibold">Quantité totale</span>
                                            <span className="font-bold text-lg">
                                                {watchItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-primary/5 border border-primary/20 rounded-xl px-6 py-4 text-right space-y-2 w-full sm:w-auto">
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{tvaEnabled ? "Total TTC" : "Total"}</p>
                                            <p className="text-3xl font-bold">
                                                {total.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                                            </p>
                                        </div>
                                        {selectedSupplier && Number(selectedSupplier.withholdingRate ?? 0) > 0 && total > 0 && (() => {
                                            const whRate = Number(selectedSupplier.withholdingRate)
                                            const whAmount = total * (whRate / 100)
                                            const netPayment = total - whAmount
                                            return (
                                                <div className="border-t border-primary/20 pt-2 space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-red-600 font-semibold">Retenue à la source ({whRate}%)</span>
                                                        <span className="text-red-600 font-bold">-{whAmount.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm font-bold">
                                                        <span className="text-emerald-700">Net à payer au fournisseur</span>
                                                        <span className="text-emerald-700">{netPayment.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA</span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">La retenue est versée à la DGI via le G50</p>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>

                                  {/* ── integrated payment panel ────────────────── */}
                                  <Card className={cn(
                                      "shadow-xl border rounded-2xl overflow-hidden my-8 transition-all duration-300",
                                      payImmediately 
                                          ? "border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-br from-slate-50/90 to-emerald-50/5 dark:from-slate-950/90 dark:to-emerald-950/5 shadow-emerald-500/5"
                                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                                  )}>
                                      <CardHeader className={cn(
                                          "pb-4 pt-4 flex flex-row items-center justify-between border-b transition-colors duration-300",
                                          payImmediately
                                              ? "bg-emerald-500/10 border-emerald-500/10 dark:bg-emerald-500/5 dark:border-emerald-500/5"
                                              : "bg-slate-50/50 border-slate-100 dark:bg-slate-900/20 dark:border-slate-900/50"
                                      )}>
                                          <CardTitle className="text-base font-bold flex items-center gap-2">
                                              <div className={cn(
                                                  "p-2 rounded-xl transition-all duration-300",
                                                  payImmediately 
                                                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105" 
                                                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                              )}>
                                                  <DollarSign className="h-4.5 w-4.5 font-bold" />
                                              </div>
                                              <div>
                                                  <span className="text-slate-900 dark:text-slate-100 font-extrabold tracking-tight">Règlement Initial</span>
                                                  <span className="text-[10px] text-muted-foreground block font-medium mt-0.5">Enregistrer un versement immédiat</span>
                                              </div>
                                          </CardTitle>
                                          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-2xl shadow-sm hover:shadow transition-all duration-200 cursor-pointer">
                                              <Checkbox
                                                  id="pay-immediately-checkbox"
                                                  checked={payImmediately}
                                                  onCheckedChange={(checked) => {
                                                      setPayImmediately(!!checked);
                                                      if (checked) {
                                                          setInitialPayAmount(total);
                                                      }
                                                  }}
                                                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                              />
                                              <label
                                                  htmlFor="pay-immediately-checkbox"
                                                  className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none"
                                              >
                                                  Enregistrer un règlement
                                              </label>
                                          </div>
                                      </CardHeader>
                                      {payImmediately && (
                                          <CardContent className="p-6 space-y-6 animate-in slide-in-from-top-4 duration-300 ease-out">
                                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                                  {/* 1. Caisse / Banque */}
                                                  <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                                                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                          <Wallet className="h-3.5 w-3.5 text-indigo-500" />
                                                          <span>Caisse / Banque</span>
                                                      </div>
                                                      <Select
                                                          value={initialPayAccountId}
                                                          onValueChange={setInitialPayAccountId}
                                                      >
                                                          <SelectTrigger className="border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold focus:ring-emerald-500 rounded-xl h-10">
                                                              <SelectValue placeholder="Choisir la caisse/banque..." />
                                                          </SelectTrigger>
                                                          <SelectContent className="rounded-xl">
                                                              {accounts.map(acc => (
                                                                  <SelectItem key={acc.id} value={acc.id} className="font-semibold rounded-lg my-0.5">
                                                                      <span className="flex items-center gap-1.5">
                                                                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                                                          {acc.name} <strong className="text-emerald-600 dark:text-emerald-450 ml-1">({Number(acc.balance).toLocaleString()} DA)</strong>
                                                                      </span>
                                                                  </SelectItem>
                                                              ))}
                                                          </SelectContent>
                                                      </Select>
                                                  </div>

                                                  {/* 2. Montant */}
                                                  <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                                                      <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                              <Coins className="h-3.5 w-3.5 text-amber-500" />
                                                              <span>Montant à régler</span>
                                                          </div>
                                                      </div>
                                                      <div className="relative">
                                                          <Input
                                                              type="number"
                                                              placeholder="0.00"
                                                              value={initialPayAmount || ""}
                                                              onChange={e => setInitialPayAmount(e.target.valueAsNumber || 0)}
                                                              className="font-extrabold text-base pr-10 border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 focus-visible:ring-emerald-500 rounded-xl h-10 transition-all text-emerald-600 dark:text-emerald-400"
                                                          />
                                                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">DA</span>
                                                      </div>
                                                      
                                                      {/* Quick Actions buttons */}
                                                      <div className="flex gap-1.5 pt-1">
                                                          <button 
                                                              type="button"
                                                              onClick={() => setInitialPayAmount(total)}
                                                              className="text-[9px] font-extrabold px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/40 transition-colors uppercase tracking-wider"
                                                          >
                                                              100% (Total)
                                                          </button>
                                                          <button 
                                                              type="button"
                                                              onClick={() => setInitialPayAmount(Number((total / 2).toFixed(2)))}
                                                              className="text-[9px] font-extrabold px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-400 border border-amber-200/40 transition-colors uppercase tracking-wider"
                                                          >
                                                              50% (Acompte)
                                                          </button>
                                                          <button 
                                                              type="button"
                                                              onClick={() => setInitialPayAmount(0)}
                                                              className="text-[9px] font-extrabold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 border border-slate-200/30 transition-colors uppercase tracking-wider"
                                                          >
                                                              Vider
                                                          </button>
                                                      </div>
                                                  </div>

                                                  {/* 3. Mode de Règlement */}
                                                  <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                                                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                          <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                                                          <span>Mode de règlement</span>
                                                      </div>
                                                      <Select
                                                          value={initialPayMethod}
                                                          onValueChange={setInitialPayMethod}
                                                      >
                                                          <SelectTrigger className="border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold focus:ring-emerald-500 rounded-xl h-10">
                                                              <SelectValue placeholder="Choisir le mode..." />
                                                          </SelectTrigger>
                                                          <SelectContent className="rounded-xl">
                                                              <SelectItem value="CASH" className="font-semibold rounded-lg my-0.5">💵 Espèce</SelectItem>
                                                              <SelectItem value="VERSEMENT" className="font-semibold rounded-lg my-0.5">🏦 Versement</SelectItem>
                                                              <SelectItem value="VIREMENT" className="font-semibold rounded-lg my-0.5">⚡ Virement</SelectItem>
                                                              <SelectItem value="CHEQUE" className="font-semibold rounded-lg my-0.5">✍️ Chèque</SelectItem>
                                                              <SelectItem value="CARTE" className="font-semibold rounded-lg my-0.5">💳 Carte Bancaire</SelectItem>
                                                          </SelectContent>
                                                      </Select>
                                                  </div>

                                                  {/* 4. Observation */}
                                                  <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                                                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                          <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                                                          <span>Observation / Notes</span>
                                                      </div>
                                                      <Input
                                                          placeholder="Acompte, paiement solde..."
                                                          value={initialPayNotes}
                                                          onChange={e => setInitialPayNotes(e.target.value)}
                                                          className="border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 focus-visible:ring-emerald-500 rounded-xl h-10 font-semibold"
                                                      />
                                                  </div>
                                              </div>
                                          </CardContent>
                                      )}
                                  </Card>

                                 {/* Notes & Visual Proof (Photos) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                                    <Card className="md:col-span-1 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" /> Notes & Remarques
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <FormField
                                                control={form.control}
                                                name="notes"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Textarea
                                                                disabled={loading || !canEdit}
                                                                placeholder="Ajouter des notes ou remarques particulières..."
                                                                className="min-h-[140px] resize-none text-sm"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card className="md:col-span-2 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <Package className="h-4 w-4 text-muted-foreground" /> Preuves d'achat (Max 3 photos)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="imageUrl1"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col items-center">
                                                            <FormLabel className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 justify-center">
                                                                Photo 1
                                                                {field.value && (
                                                                    <button type="button" onClick={() => setLightboxUrl(field.value)} className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded hover:bg-indigo-50 transition-colors" title="Agrandir">
                                                                        <ZoomIn className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <ImageUpload
                                                                    value={field.value ? [field.value] : []}
                                                                    disabled={loading || !canEdit}
                                                                    onChange={(url) => field.onChange(url)}
                                                                    onRemove={() => field.onChange("")}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="imageUrl2"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col items-center">
                                                            <FormLabel className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 justify-center">
                                                                Photo 2
                                                                {field.value && (
                                                                    <button type="button" onClick={() => setLightboxUrl(field.value)} className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded hover:bg-indigo-50 transition-colors" title="Agrandir">
                                                                        <ZoomIn className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <ImageUpload
                                                                    value={field.value ? [field.value] : []}
                                                                    disabled={loading || !canEdit}
                                                                    onChange={(url) => field.onChange(url)}
                                                                    onRemove={() => field.onChange("")}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="imageUrl3"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col items-center">
                                                            <FormLabel className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 justify-center">
                                                                Photo 3
                                                                {field.value && (
                                                                    <button type="button" onClick={() => setLightboxUrl(field.value)} className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded hover:bg-indigo-50 transition-colors" title="Agrandir">
                                                                        <ZoomIn className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <ImageUpload
                                                                    value={field.value ? [field.value] : []}
                                                                    disabled={loading || !canEdit}
                                                                    onChange={(url) => field.onChange(url)}
                                                                    onRemove={() => field.onChange("")}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Submit */}
                                {canEdit && ocrItems.length === 0 && (
                                    <Button id="global-save-button" disabled={loading} className="w-full md:w-auto min-w-40" type="submit">
                                        {loading ? "Enregistrement..." : isEditMode ? "✓ Enregistrer les modifications" : "✓ Créer le bon"}
                                        <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F8]</span>
                                    </Button>
                                )}
                            </>
                        )}
                    </form>
                </Form>

                {/* Stunning inline Quick Product Dialog with Tabbed Navigation (Fiche Produit Complète Express) */}
                <Dialog open={quickProductOpen} onOpenChange={setQuickProductOpen}>
                    <DialogContent className="max-w-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
                        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-900">
                            <DialogTitle className="text-xl font-bold flex items-center justify-between text-indigo-950 dark:text-indigo-400">
                                <span className="flex items-center gap-2">
                                    <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                                    Fiche Produit Express
                                </span>
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-none text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    Modèle Complet
                                </Badge>
                            </DialogTitle>
                        </DialogHeader>

                        {/* Navigation Tabs bar */}
                        <div className="flex gap-1.5 p-1 bg-slate-50 dark:bg-slate-900/60 rounded-xl my-4 border border-slate-100 dark:border-slate-800/80">
                            {[
                                { id: "general", label: "Général", icon: Package },
                                { id: "pricing", label: "Prix & Tarifs", icon: DollarSign },
                                { id: "barcodes", label: "Codes-barres & Photos", icon: Barcode },
                                { id: "stock", label: "Stock & Visibilité", icon: Tag }
                            ].map((t) => {
                                const Icon = t.icon
                                const isActive = quickTab === t.id
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setQuickTab(t.id as any)}
                                        className={cn(
                                            "flex items-center gap-1.5 flex-1 justify-center py-2 text-xs font-bold transition-all rounded-lg",
                                            isActive
                                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-[1.02]"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {t.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Tab Contents */}
                        <div className="min-h-[300px] max-h-[50vh] overflow-y-auto px-1 py-2 space-y-4">
                            {/* GENERAL TAB */}
                            {quickTab === "general" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nom du Produit *</label>
                                        <div className="relative">
                                            <Input
                                                disabled={loading}
                                                placeholder="Ex: Coca Cola 33cl ou iPhone 14 Pro Max"
                                                value={quickName}
                                                onChange={async (e) => {
                                                    const val = e.target.value
                                                    setQuickName(val)
                                                    if (val.trim()) {
                                                        const res = await suggestProductNames(val)
                                                        setQuickSuggestions(res)
                                                        setShowQuickSuggestions(res.length > 0)
                                                    } else {
                                                        setQuickSuggestions([])
                                                        setShowQuickSuggestions(false)
                                                    }
                                                    setFocusedQuickSuggestionIndex(-1)
                                                }}
                                                onFocus={async () => {
                                                    if (quickName.trim()) {
                                                        const res = await suggestProductNames(quickName)
                                                        setQuickSuggestions(res)
                                                        setShowQuickSuggestions(res.length > 0)
                                                    }
                                                }}
                                                onBlur={() => {
                                                    setTimeout(() => setShowQuickSuggestions(false), 200)
                                                }}
                                                onKeyDown={(e) => {
                                                    if (!showQuickSuggestions || quickSuggestions.length === 0) return

                                                    if (e.key === "ArrowDown") {
                                                        e.preventDefault()
                                                        setFocusedQuickSuggestionIndex(prev => 
                                                            prev < quickSuggestions.length - 1 ? prev + 1 : 0
                                                        )
                                                    } else if (e.key === "ArrowUp") {
                                                        e.preventDefault()
                                                        setFocusedQuickSuggestionIndex(prev => 
                                                            prev > 0 ? prev - 1 : quickSuggestions.length - 1
                                                        )
                                                    } else if (e.key === "Enter") {
                                                        if (focusedQuickSuggestionIndex >= 0 && focusedQuickSuggestionIndex < quickSuggestions.length) {
                                                            e.preventDefault()
                                                            setQuickName(quickSuggestions[focusedQuickSuggestionIndex])
                                                            setShowQuickSuggestions(false)
                                                        }
                                                    } else if (e.key === "Escape") {
                                                        setShowQuickSuggestions(false)
                                                    }
                                                }}
                                                className="text-sm font-semibold border-slate-200 dark:border-slate-800"
                                                autoComplete="off"
                                            />
                                            {showQuickSuggestions && quickSuggestions.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-border/85 rounded-lg shadow-xl divide-y divide-border/50 animate-in fade-in slide-in-from-top-1 duration-100">
                                                    {quickSuggestions.map((name, idx) => (
                                                        <div
                                                            key={name}
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                setQuickName(name)
                                                                setShowQuickSuggestions(false)
                                                            }}
                                                            className={cn(
                                                                "px-4 py-2.5 text-sm cursor-pointer select-none transition-colors text-left font-medium",
                                                                idx === focusedQuickSuggestionIndex 
                                                                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                                                                    : "text-slate-700 dark:text-slate-355 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                            )}
                                                        >
                                                            {name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Catégorie *</label>
                                                {!showNewCategoryInput ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowNewCategoryInput(true); setNewCategoryName(""); }}
                                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        <Plus className="h-3 w-3" /> Nouvelle
                                                    </button>
                                                ) : null}
                                            </div>
                                            {!showNewCategoryInput ? (
                                                <Select value={quickCategoryId} onValueChange={setQuickCategoryId} disabled={loading}>
                                                    <SelectTrigger className="border-slate-200 dark:border-slate-800"><SelectValue placeholder="Choisir la catégorie..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {localCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex gap-1.5 items-center animate-in fade-in duration-200">
                                                    <Input
                                                        placeholder="Nom catégorie..."
                                                        value={newCategoryName}
                                                        onChange={e => setNewCategoryName(e.target.value)}
                                                        className="h-9 text-xs border-indigo-200 dark:border-indigo-900/50"
                                                        onKeyDown={e => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                handleCreateCategory();
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-9 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                                        onClick={handleCreateCategory}
                                                        disabled={creatingCat}
                                                    >
                                                        ✓
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-9 px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                        onClick={() => setShowNewCategoryInput(false)}
                                                    >
                                                        ✕
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Marque *</label>
                                                {!showNewBrandInput ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowNewBrandInput(true); setNewBrandName(""); }}
                                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        <Plus className="h-3 w-3" /> Nouvelle
                                                    </button>
                                                ) : null}
                                            </div>
                                            {!showNewBrandInput ? (
                                                <Select value={quickBrandId} onValueChange={setQuickBrandId} disabled={loading}>
                                                    <SelectTrigger className="border-slate-200 dark:border-slate-800"><SelectValue placeholder="Choisir la marque..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {localBrands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex gap-1.5 items-center animate-in fade-in duration-200">
                                                    <Input
                                                        placeholder="Nom marque..."
                                                        value={newBrandName}
                                                        onChange={e => setNewBrandName(e.target.value)}
                                                        className="h-9 text-xs border-indigo-200 dark:border-indigo-900/50"
                                                        onKeyDown={e => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                handleCreateBrand();
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-9 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                                        onClick={handleCreateBrand}
                                                        disabled={creatingBrand}
                                                    >
                                                        ✓
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-9 px-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                        onClick={() => setShowNewBrandInput(false)}
                                                    >
                                                        ✕
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description du produit</label>
                                        <Textarea
                                            disabled={loading}
                                            placeholder="Fiche technique ou description rapide du produit..."
                                            value={quickDescription}
                                            onChange={e => setQuickDescription(e.target.value)}
                                            className="text-sm min-h-[100px] border-slate-200 dark:border-slate-800"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* PRICING TAB */}
                            {quickTab === "pricing" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className={cn("grid gap-4", tvaEnabled ? "grid-cols-2" : "grid-cols-1")}>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                                <ShoppingCart className="h-3.5 w-3.5" /> {tvaEnabled ? "Coût d'achat HT (DA) *" : "Coût d'achat (DA) *"}
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    disabled={loading}
                                                    placeholder="0.00"
                                                    value={quickCost || ""}
                                                    onChange={e => handleQuickCostChange(e.target.valueAsNumber || 0)}
                                                    className="font-bold border-indigo-200 dark:border-indigo-900/50 pr-12 focus-visible:ring-indigo-500"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">DA</span>
                                            </div>
                                        </div>

                                        {tvaEnabled && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Taux de TVA (%)</label>
                                                <Select value={String(quickTva)} onValueChange={v => setQuickTva(Number(v))} disabled={loading}>
                                                    <SelectTrigger className="border-slate-200 dark:border-slate-800 font-semibold"><SelectValue placeholder="TVA..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="19">19% (Taux normal)</SelectItem>
                                                        <SelectItem value="9">9% (Taux réduit)</SelectItem>
                                                        <SelectItem value="0">0% (Exonéré)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                <Store className="h-3.5 w-3.5" /> {tvaEnabled ? "Vente Public TTC" : "Vente Public"}
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    disabled={loading}
                                                    placeholder="0.00"
                                                    value={quickPrice || ""}
                                                    onChange={e => setQuickPrice(e.target.valueAsNumber || 0)}
                                                    className="font-bold border-blue-100 dark:border-blue-900/40 pr-12 text-blue-700 dark:text-blue-300"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">DA</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <Package className="h-3.5 w-3.5" /> Demi-Gros / Gros
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    disabled={loading}
                                                    placeholder="0.00"
                                                    value={quickWholesalePrice || ""}
                                                    onChange={e => setQuickWholesalePrice(e.target.valueAsNumber || 0)}
                                                    className="font-bold border-emerald-100 dark:border-emerald-900/40 pr-12 text-emerald-700 dark:text-emerald-300"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">DA</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                                <UsersIcon className="h-3.5 w-3.5" /> {tvaEnabled ? "Revendeur TTC" : "Revendeur"}
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    disabled={loading}
                                                    placeholder="0.00"
                                                    value={quickDealerPrice || ""}
                                                    onChange={e => setQuickDealerPrice(e.target.valueAsNumber || 0)}
                                                    className="font-bold border-purple-100 dark:border-purple-900/40 pr-12 text-purple-700 dark:text-purple-300"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">DA</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual Margins calculator */}
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                                        <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                            <Percent className="h-3.5 w-3.5 text-emerald-500" /> Marges calculées live
                                        </p>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            {[
                                                { label: "Marge Public", cost: quickCost, price: quickPrice, color: "text-blue-600 dark:text-blue-400 bg-blue-500/5" },
                                                { label: "Marge Gros", cost: quickCost, price: quickWholesalePrice, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5" },
                                                { label: "Marge Revendeur", cost: quickCost, price: quickDealerPrice, color: "text-purple-600 dark:text-purple-400 bg-purple-500/5" }
                                            ].map((m, idx) => {
                                                const margin = m.cost > 0 && m.price > 0 ? (((m.price - m.cost) / m.cost) * 100).toFixed(0) : "—"
                                                const isPositive = margin !== "—" && Number(margin) >= 0
                                                return (
                                                    <div key={idx} className={cn("p-2 rounded-xl border border-slate-200/60 dark:border-slate-800", m.color)}>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{m.label}</p>
                                                        <p className={cn("text-sm font-black mt-0.5", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                                                            {margin !== "—" ? `${margin}%` : "—"}
                                                        </p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BARCODES & PHOTOS TAB */}
                            {quickTab === "barcodes" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                <Barcode className="h-4 w-4 text-slate-500" /> Codes-barres
                                            </label>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="xs"
                                                    onClick={() => setQuickBarcodes(prev => [...prev, { value: "", label: "" }])}
                                                    className="h-7 text-[10px] font-bold py-1 px-2.5 rounded-lg border-indigo-200 dark:border-indigo-800 text-indigo-600"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" /> Ajouter
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="xs"
                                                    onClick={handleGenerateQuickBarcode}
                                                    className="h-7 text-[10px] font-bold py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                                                    disabled={loading}
                                                >
                                                    <Wand2 className="h-3 w-3 mr-1" /> Générer
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 max-h-36 overflow-y-auto border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50">
                                            {quickBarcodes.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-4 italic">Aucun code-barre. Cliquez sur Générer ou Ajouter.</p>
                                            ) : (
                                                quickBarcodes.map((bar, index) => (
                                                    <div key={index} className="flex gap-2 items-center bg-white dark:bg-slate-900 p-1.5 rounded-lg border shadow-sm">
                                                        <Input
                                                            disabled={loading}
                                                            placeholder="Code-barre (scanner ou taper)..."
                                                            value={bar.value}
                                                            onChange={e => {
                                                                const val = e.target.value
                                                                setQuickBarcodes(prev => prev.map((b, i) => i === index ? { ...b, value: val } : b))
                                                            }}
                                                            className="h-8 text-xs font-mono text-center flex-1"
                                                        />
                                                        <Input
                                                            disabled={loading}
                                                            placeholder="Type (ex: Cartouche)..."
                                                            value={bar.label}
                                                            onChange={e => {
                                                                const val = e.target.value
                                                                setQuickBarcodes(prev => prev.map((b, i) => i === index ? { ...b, label: val } : b))
                                                            }}
                                                            className="h-8 text-xs w-28 text-center"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-700"
                                                            onClick={() => setQuickBarcodes(prev => prev.filter((_, i) => i !== index))}
                                                        >
                                                            <Trash className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Images du produit (Max 3)</label>
                                        <div className="flex justify-center p-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50">
                                            <ImageUpload
                                                value={quickImages.map(img => img.url)}
                                                disabled={loading}
                                                onChange={(url) => setQuickImages(prev => [...prev, { url }])}
                                                onRemove={(url) => setQuickImages(prev => prev.filter(img => img.url !== url))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STOCK & OPTIONS TAB */}
                            {quickTab === "stock" && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Stock Initial</label>
                                            <Input
                                                type="number"
                                                disabled={loading}
                                                placeholder="0"
                                                value={quickStock || ""}
                                                onChange={e => setQuickStock(e.target.valueAsNumber || 0)}
                                                className="font-bold border-slate-200 dark:border-slate-800 text-center"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Stock Minimum</label>
                                            <Input
                                                type="number"
                                                disabled={loading}
                                                placeholder="5"
                                                value={quickMinStock || ""}
                                                onChange={e => setQuickMinStock(e.target.valueAsNumber || 0)}
                                                className="font-bold border-slate-200 dark:border-slate-800 text-center"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Paramètres de visibilité</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div
                                                onClick={() => setQuickIsFeatured(!quickIsFeatured)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all hover:scale-[1.01] shadow-sm select-none",
                                                    quickIsFeatured
                                                        ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400"
                                                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                                )}
                                            >
                                                <Checkbox checked={quickIsFeatured} onCheckedChange={() => {}} className="pointer-events-none" />
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold flex items-center gap-1.5">
                                                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" /> Produit Vedette
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">Mettre en avant sur la caisse tactile.</p>
                                                </div>
                                            </div>

                                            <div
                                                onClick={() => setQuickIsArchived(!quickIsArchived)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all hover:scale-[1.01] shadow-sm select-none",
                                                    quickIsArchived
                                                        ? "bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-900/50 dark:border-slate-700"
                                                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                                )}
                                            >
                                                <Checkbox checked={quickIsArchived} onCheckedChange={() => {}} className="pointer-events-none" />
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold flex items-center gap-1.5">
                                                        <Archive className="h-3.5 w-3.5 text-slate-500" /> Archiver le Produit
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">Masquer du POS et du catalogue.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dialog Footer Actions */}
                        <DialogFooter className="gap-2 border-t border-slate-100 dark:border-slate-900 pt-4 mt-2">
                            <Button type="button" variant="outline" onClick={() => setQuickProductOpen(false)} disabled={loading} className="text-xs font-bold rounded-xl h-10 px-4">
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                onClick={handleCreateQuickProduct}
                                disabled={loading || !quickName.trim()}
                                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-xs font-black shadow-md hover:shadow-emerald-500/10 transition-all rounded-xl h-10 px-5 flex items-center gap-1.5"
                            >
                                <CheckCircle className="h-4.5 w-4.5" />
                                {loading ? "Création..." : "Enregistrer & Insérer"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/* Live Weighted Average Price (PMP) & Selling Price Suggester */}
                <Dialog open={pmpOpen} onOpenChange={setPmpOpen}>
                    <DialogContent className="max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-black flex items-center gap-2 text-indigo-950 dark:text-indigo-400">
                                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                                Simulateur PMP & Prix de Vente
                            </DialogTitle>
                        </DialogHeader>
                        {pmpRowIndex !== null && (() => {
                            const prodId = watchItems[pmpRowIndex]?.productId
                            const activeProduct = localProducts.find(p => p.id === prodId)
                            if (!activeProduct) return null
                            
                            const oldStock = Number(activeProduct.stock || 0)
                            const oldCost = Number(activeProduct.cost || 0)
                            const newQty = Number(watchItems[pmpRowIndex]?.quantity || 0)
                            const newCost = Number(watchItems[pmpRowIndex]?.costPrice || 0)
                            
                            const totalStock = oldStock + newQty
                            const totalValue = (oldStock * oldCost) + (newQty * newCost)
                            const calculatedPmp = totalStock > 0 ? (totalValue / totalStock) : newCost

                            return (
                                <div className="space-y-4 py-3">
                                    {/* Product Details Banner */}
                                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 p-3.5 rounded-2xl flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider">Produit sélectionné</p>
                                            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm truncate mt-0.5" title={activeProduct.name}>
                                                {activeProduct.name}
                                            </h4>
                                        </div>
                                    </div>

                                    {/* Real-time comparison grid */}
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl flex flex-col justify-between">
                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Stock Actuel</span>
                                            <span className="text-xs font-extrabold text-slate-850 dark:text-slate-200 mt-2">{oldStock} unités</span>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">Coût: {oldCost.toLocaleString()} DA</span>
                                        </div>

                                        <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 rounded-xl flex flex-col justify-between relative overflow-hidden">
                                            <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider">Nouvel Achat</span>
                                            <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 mt-2">+{newQty} unités</span>
                                            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 mt-1">Coût: {newCost.toLocaleString()} DA</span>
                                        </div>

                                        <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/5 border border-emerald-500/25 dark:border-emerald-500/35 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-sm">
                                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider flex items-center gap-0.5">
                                                <Sparkles className="h-3 w-3 text-emerald-500" /> Nouveau PMP
                                            </span>
                                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 mt-2">
                                                {calculatedPmp.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-[8px] font-bold">DA</span>
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">Total: {totalStock} unités</span>
                                        </div>
                                    </div>

                                    <Separator className="border-slate-100 dark:border-slate-800" />

                                    <div className="space-y-2.5">
                                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                                            Ajustement des Prix de Vente TTC (Calculateur de Marges)
                                        </h5>
                                        
                                        <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                            {/* Retail margin */}
                                            <div className="grid grid-cols-12 gap-3 items-center">
                                                <div className="col-span-4 flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Détail / Public</span>
                                                    <span className="text-[10px] text-slate-400">Prix public conseillé</span>
                                                </div>
                                                <div className="col-span-3 flex items-center border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-950 px-2 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-colors shadow-sm">
                                                    <input
                                                        type="number"
                                                        value={pmpRetailMargin}
                                                        onChange={e => {
                                                            const m = Number(e.target.value) || 0
                                                            setPmpRetailMargin(m)
                                                            setPmpRetailPrice(Number((calculatedPmp * (1 + m / 100)).toFixed(2)))
                                                        }}
                                                        className="w-full text-xs font-black text-emerald-600 dark:text-emerald-400 focus:outline-none border-none bg-transparent text-center"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-450">%</span>
                                                </div>
                                                <div className="col-span-5 flex items-center border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-950 px-2 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-colors shadow-sm">
                                                    <input
                                                        type="number"
                                                        value={pmpRetailPrice}
                                                        onChange={e => {
                                                            const p = Number(e.target.value) || 0
                                                            setPmpRetailPrice(p)
                                                            if (calculatedPmp > 0) setPmpRetailMargin(Number((((p - calculatedPmp) / calculatedPmp) * 100).toFixed(1)))
                                                        }}
                                                        className="w-full text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none border-none bg-transparent text-right"
                                                    />
                                                    <span className="text-[9px] font-bold text-slate-400 ml-1.5">DA</span>
                                                </div>
                                            </div>

                                            {/* Dealer margin */}
                                            <div className="grid grid-cols-12 gap-3 items-center">
                                                <div className="col-span-4 flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Revendeur</span>
                                                    <span className="text-[10px] text-slate-400">Prix revendeurs B2B</span>
                                                </div>
                                                <div className="col-span-3 flex items-center border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-950 px-2 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-colors shadow-sm">
                                                    <input
                                                        type="number"
                                                        value={pmpDealerMargin}
                                                        onChange={e => {
                                                            const m = Number(e.target.value) || 0
                                                            setPmpDealerMargin(m)
                                                            setPmpDealerPrice(Number((calculatedPmp * (1 + m / 100)).toFixed(2)))
                                                        }}
                                                        className="w-full text-xs font-black text-indigo-600 dark:text-indigo-400 focus:outline-none border-none bg-transparent text-center"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-455">%</span>
                                                </div>
                                                <div className="col-span-5 flex items-center border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-950 px-2 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-colors shadow-sm">
                                                    <input
                                                        type="number"
                                                        value={pmpDealerPrice}
                                                        onChange={e => {
                                                            const p = Number(e.target.value) || 0
                                                            setPmpDealerPrice(p)
                                                            if (calculatedPmp > 0) setPmpDealerMargin(Number((((p - calculatedPmp) / calculatedPmp) * 100).toFixed(1)))
                                                        }}
                                                        className="w-full text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none border-none bg-transparent text-right"
                                                    />
                                                    <span className="text-[9px] font-bold text-slate-400 ml-1.5">DA</span>
                                                </div>
                                            </div>

                                            {/* Wholesale margin */}
                                            <div className="grid grid-cols-12 gap-3 items-center">
                                                <div className="col-span-4 flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Demi-Gros / Gros</span>
                                                    <span className="text-[10px] text-slate-400">Prix de vente de gros</span>
                                                </div>
                                                <div className="col-span-3 flex items-center border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-950 px-2 py-1.5 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-colors shadow-sm">
                                                    <input
                                                        type="number"
                                                        value={pmpWholesaleMargin}
                                                        onChange={e => {
                                                            const m = Number(e.target.value) || 0
                                                            setPmpWholesaleMargin(m)
                                                            setPmpWholesalePrice(Number((calculatedPmp * (1 + m / 100)).toFixed(2)))
                                                        }}
                                                        className="w-full text-xs font-black text-purple-600 dark:text-purple-400 focus:outline-none border-none bg-transparent text-center"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-460">%</span>
                                                </div>
                                                <div className="col-span-5 flex items-center border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-950 px-2 py-1.5 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-colors shadow-sm">
                                                    <input
                                                        type="number"
                                                        value={pmpWholesalePrice}
                                                        onChange={e => {
                                                            const p = Number(e.target.value) || 0
                                                            setPmpWholesalePrice(p)
                                                            if (calculatedPmp > 0) setPmpWholesaleMargin(Number((((p - calculatedPmp) / calculatedPmp) * 100).toFixed(1)))
                                                        }}
                                                        className="w-full text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none border-none bg-transparent text-right"
                                                    />
                                                    <span className="text-[9px] font-bold text-slate-400 ml-1.5">DA</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}
                        <DialogFooter className="gap-2 border-t border-slate-100 dark:border-slate-900 pt-4 mt-2">
                            <Button variant="outline" onClick={() => setPmpOpen(false)} disabled={loading} className="text-xs font-bold rounded-xl h-10 px-4">
                                Fermer
                            </Button>
                            <Button onClick={handleApplyPmpPrices} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-black shadow-md hover:shadow-indigo-500/10 transition-all rounded-xl h-10 px-5 flex items-center gap-1.5">
                                <CheckCircle className="h-4 w-4" /> Enregistrer & Mettre à jour
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Fullscreen click-to-zoom Lightbox for Invoice justifications */}
                <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
                    <DialogContent className="max-w-4xl bg-black/90 border-none p-0 overflow-hidden flex flex-col items-center justify-center rounded-2xl">
                        {lightboxUrl && (
                            <div className="relative w-full h-[80vh] flex items-center justify-center p-4">
                                <img
                                    src={lightboxUrl}
                                    alt="Invoice verification Lightbox"
                                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-300 hover:scale-105"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setLightboxUrl(null)}
                                    className="absolute top-4 right-4 text-white hover:bg-white/20 h-8 w-8 rounded-full p-0 flex items-center justify-center"
                                >
                                    ✕
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Sleek Delete Form Confirmation Dialog */}
                <Dialog open={deleteFormOpen} onOpenChange={setDeleteFormOpen}>
                    <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-2xl p-6 transition-all duration-250">
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2.5">
                                <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                                    <Trash className="h-5 w-5 animate-pulse" />
                                </span>
                                Supprimer ce bon d'achat
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                Cette action est <span className="text-red-600 dark:text-red-400 font-bold">définitive</span>. Elle annulera la commande, restaurera les stocks physiques, et créditera/débitera les comptes de trésorerie associés.
                            </p>
                            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                                <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 block mb-1">
                                    Mot de passe de sécurité (111)
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Saisir le mot de passe..."
                                    value={deleteFormPassword}
                                    onChange={e => setDeleteFormPassword(e.target.value)}
                                    disabled={loading}
                                    className="text-sm font-mono text-center tracking-widest font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-red-500 h-10"
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && deleteFormPassword) handleFormDelete()
                                    }}
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex flex-row items-center justify-end gap-2 mt-2">
                            <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={() => setDeleteFormOpen(false)} 
                                disabled={loading}
                                className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/60 font-semibold"
                            >
                                Annuler
                            </Button>
                            <Button 
                                type="button"
                                variant="destructive" 
                                size="sm" 
                                onClick={handleFormDelete} 
                                disabled={loading || !deleteFormPassword}
                                className="rounded-xl bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700 font-semibold shadow-md shadow-red-500/10 flex items-center gap-1.5"
                            >
                                {loading ? "Suppression..." : "✓ Confirmer la suppression"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Sleek Partial Payment Dialog Form */}
                <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
                    <DialogContent className="max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl p-6">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-indigo-950 dark:text-indigo-400">
                                <DollarSign className="h-5 w-5 text-emerald-600" />
                                Enregistrer un règlement fournisseur
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Montant du règlement (DA) *</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        disabled={loading}
                                        placeholder="0.00"
                                        value={payAmount || ""}
                                        onChange={e => setPayAmount(e.target.valueAsNumber || 0)}
                                        className="font-bold text-emerald-600 border-slate-200 dark:border-slate-800 text-lg pr-12"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">DA</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mode de règlement</label>
                                    <Select value={payMethod} onValueChange={setPayMethod} disabled={loading}>
                                        <SelectTrigger className="border-slate-200 dark:border-slate-800 font-semibold text-xs"><SelectValue placeholder="Mode..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Espèce">Espèce</SelectItem>
                                            <SelectItem value="Chèque">Chèque</SelectItem>
                                            <SelectItem value="Carte Bancaire">Carte Bancaire</SelectItem>
                                            <SelectItem value="Virement">Virement</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Caisse / Banque</label>
                                    <Select value={payAccountId} onValueChange={setPayAccountId} disabled={loading}>
                                        <SelectTrigger className="border-slate-200 dark:border-slate-800 font-semibold text-xs"><SelectValue placeholder="Compte..." /></SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(a => (
                                                <SelectItem key={a.id} value={a.id} className="text-xs">
                                                    {a.name} ({Number(a.balance).toLocaleString()} DA)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Observation / Notes (Optionnel)</label>
                                <Input
                                    disabled={loading}
                                    placeholder="Ex: Acompte n°1, chèque reçu..."
                                    value={payNotes}
                                    onChange={e => setPayNotes(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 border-t border-slate-100 dark:border-slate-900 pt-4 mt-2">
                            <Button variant="outline" size="sm" onClick={() => setPayModalOpen(false)} disabled={loading}>
                                Annuler
                            </Button>
                            <Button
                                onClick={handleRegisterPayment}
                                disabled={loading || payAmount <= 0 || !payAccountId}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                            >
                                <CheckCircle className="h-4 w-4" />
                                {loading ? "Enregistrement..." : "✓ Confirmer le règlement"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    )
}
