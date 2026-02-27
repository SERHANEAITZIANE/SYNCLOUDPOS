"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { TreasuryAccount } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { TreasuryTransactionColumn } from "./types"

interface TransactionsClientProps {
    data: TreasuryTransactionColumn[]
    account: TreasuryAccount
}

export const TransactionsClient: React.FC<TransactionsClientProps> = ({
    data,
    account
}) => {
    const router = useRouter()

    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => router.push("/treasury")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Heading
                        title={`Logs: ${account.name}`}
                        description={`Transaction history for this ${account.type.toLowerCase()}`}
                    />
                </div>
            </div>
            <Separator />
            <DataTable searchKey="description" columns={columns} data={data} />
        </>
    )
}
