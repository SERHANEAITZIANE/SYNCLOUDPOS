"use client"

import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { CompanyForm } from "./company-form";
import { DatabaseBackup } from "./database-backup";

interface CompanyClientProps {
    initialData: {
        id: string;
        name: string;
        ownerName: string | null;
        activity: string | null;
        address: string | null;
        wilaya: string | null;
        commune: string | null;
        phone: string | null;
        fax: string | null;
        email: string | null;
        nif: string | null;
        rc: string | null;
        artImposition: string | null;
        nis: string | null;
        bankAccount: string | null;
        logo: string | null;
        headerText: string | null;
        subscriptionEndsAt: Date | null;
    }
}

export const CompanyClient: React.FC<CompanyClientProps> = ({
    initialData
}) => {
    return (
        <>
            <div className="flex items-center justify-between">
                <Heading title="Mon Entreprise" description="Gérez les informations de votre établissement." />
            </div>
            <Separator />
            <div className="mt-8 w-full">
                <CompanyForm initialData={initialData} />
            </div>

            <Separator className="my-8" />
            <div className="w-full max-w-4xl mx-auto md:mx-0">
                <DatabaseBackup />
            </div>
        </>
    )
}
