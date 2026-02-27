import { SupplierForm } from "@/components/suppliers/supplier-form"

export default function NewSupplierPage() {
    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <SupplierForm initialData={null} />
            </div>
        </div>
    )
}
