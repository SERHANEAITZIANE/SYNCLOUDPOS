import { getActiveTenantId } from "@/actions/get-active-tenant";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CompanyClient } from "./components/client";

export default async function CompanyPage() {
    const tenantId = await getActiveTenantId();

    if (!tenantId) {
        redirect("/dashboard");
    }

    const store = await db.tenant.findUnique({
        where: { id: tenantId }
    });

    if (!store) {
        redirect("/dashboard");
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <CompanyClient initialData={{
                    id: store!.id,
                    name: store!.name,
                    ownerName: store!.ownerName,
                    activity: store!.activity,
                    address: store!.address,
                    wilaya: store!.wilaya,
                    commune: store!.commune,
                    phone: store!.phone,
                    fax: store!.fax,
                    email: store!.email,
                    nif: store!.nif,
                    rc: store!.rc,
                    artImposition: store!.artImposition,
                    nis: store!.nis,
                    bankAccount: store!.bankAccount,
                    logo: store!.logo,
                    headerText: store!.headerText,
                }} />
            </div>
        </div>
    );
}
