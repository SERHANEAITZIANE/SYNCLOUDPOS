import { getClientReturns, getSupplierReturns } from "@/actions/returns"
import { getProducts } from "@/actions/products"
import { getCustomers } from "@/actions/customers"
import { getSuppliers } from "@/actions/suppliers"
import { getTreasuryAccounts } from "@/actions/treasury"
import { db } from "@/lib/db"
import { auth } from "@/auth"
import { ReturnsClient } from "@/components/retours/returns-client"

export default async function RetoursPage(
    props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
    const searchParams = await props.searchParams;
    const session = await auth()
    const tenantId = session?.user?.tenantId
    const returnId = searchParams?.returnId as string | undefined;

    // 1. Fetch returns data
    const [clientReturnsData, supplierReturnsData] = await Promise.all([
        getClientReturns(),
        getSupplierReturns()
    ])

    // 2. Fetch options lists for the form modals
    const productsData = await getProducts(1, 10000)
    const customersData = await getCustomers(1, 10000)
    const suppliersData = await getSuppliers(1, 10000)
    const accounts = await getTreasuryAccounts()
    const stores = tenantId ? await db.store.findMany({ where: { tenantId } }) : []

    // 3. Format inputs safely
    let formattedClientReturns = clientReturnsData.returns || []
    let formattedSupplierReturns = supplierReturnsData.returns || []

    if (returnId) {
        formattedClientReturns = formattedClientReturns.filter((r: any) => r.id === returnId)
        formattedSupplierReturns = formattedSupplierReturns.filter((r: any) => r.id === returnId)
    }

    const initialTab = (returnId && formattedSupplierReturns.length > 0 && formattedClientReturns.length === 0) 
        ? "supplier" 
        : "client"

    const rawProducts = ('items' in productsData ? productsData.items : productsData) || []
    const formattedProducts = rawProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        cost: Number(p.cost ?? p.price),
        stock: Number(p.stock)
    }))

    const rawCustomers = ('customers' in customersData ? customersData.customers : customersData) || []
    const formattedCustomers = rawCustomers.map((c: any) => ({
        id: c.id,
        name: c.name,
        balance: Number(c.balance)
    }))

    const rawSuppliers = ('suppliers' in suppliersData ? suppliersData.suppliers : suppliersData) || []
    const formattedSuppliers = rawSuppliers.map((s: any) => ({
        id: s.id,
        name: s.name,
        balance: Number(s.balance)
    }))

    const formattedAccounts = accounts.map((a: any) => ({
        id: a.id,
        name: a.name,
        balance: Number(a.balance),
        type: a.type
    }))

    const formattedStores = stores.map((s: any) => ({
        id: s.id,
        name: s.name
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <ReturnsClient
                    clientReturns={formattedClientReturns}
                    supplierReturns={formattedSupplierReturns}
                    products={formattedProducts}
                    customers={formattedCustomers}
                    suppliers={formattedSuppliers}
                    accounts={formattedAccounts}
                    stores={formattedStores}
                    initialTab={initialTab}
                />
            </div>
        </div>
    )
}
