"use client"

import { QRCodeSVG } from "qrcode.react"
import { useTranslations } from "next-intl"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { CustomerColumn } from "./types"

interface CustomerQrModalProps {
    isOpen: boolean
    onClose: () => void
    customer: CustomerColumn | null
}

export const CustomerQrModal: React.FC<CustomerQrModalProps> = ({
    isOpen,
    onClose,
    customer
}) => {
    const tCommon = useTranslations("Common")

    if (!customer) return null

    // Create a robust string for the QR code
    const qrData = JSON.stringify({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        type: "CUSTOMER"
    })

    const handlePrint = () => {
        const printContent = document.getElementById("print-qr-area")
        if (!printContent) return

        const originalContents = document.body.innerHTML
        document.body.innerHTML = printContent.innerHTML
        window.print()
        document.body.innerHTML = originalContents
        window.location.reload() // Reload to restore React state bindings after innerHTML swap
    }

    return (
        <Modal
            title="Code QR du Client"
            description="Scannez ce code pour identifier le client."
            isOpen={isOpen}
            onClose={onClose}
        >
            <div className="flex flex-col items-center justify-center space-y-6 py-4">
                <div
                    id="print-qr-area"
                    className="flex flex-col items-center justify-center p-8 bg-white"
                >
                    {/* Size 10x10 cm roughly translates to 378px at 96 DPI, let's use 256 for screen and scale up in print if needed */}
                    <div className="border-4 border-black p-4 m-4 rounded-xl">
                        <QRCodeSVG
                            value={qrData}
                            size={256}
                            level="H" // High error correction
                            includeMargin={false}
                        />
                    </div>
                    <div className="text-center mt-4">
                        <h2 className="text-2xl font-bold text-black">{customer.name}</h2>
                        <p className="text-lg text-gray-600">{customer.phone}</p>
                    </div>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #print-qr-area, #print-qr-area * {
                                visibility: visible;
                            }
                            #print-qr-area {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 10cm;
                                height: 10cm;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                            }
                        }
                    `}} />
                </div>

                <div className="flex w-full justify-end space-x-2 pt-4">
                    <Button disabled={false} variant="outline" onClick={onClose}>
                        {tCommon("cancel")}
                    </Button>
                    <Button disabled={false} onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" /> Imprimer
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
