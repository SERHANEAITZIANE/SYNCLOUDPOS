import { CustomerForm } from "@/components/customers/customer-form"

export default function NewCustomerPage() {
    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <CustomerForm initialData={null} />
            </div>
        </div>
    )
}
