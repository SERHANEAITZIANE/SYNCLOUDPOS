"use client"

import { useState, useMemo } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns, TreasuryMovementColumn } from "./mouvements-columns"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { TreasuryAccountColumn } from "./types"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRange } from "react-day-picker"

interface MouvementsClientProps {
    data: TreasuryMovementColumn[]
    accounts: TreasuryAccountColumn[]
}

export const MouvementsClient: React.FC<MouvementsClientProps> = ({
    data,
    accounts
}) => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [selectedAccount, setSelectedAccount] = useState<string>("ALL")

    const filteredData = useMemo(() => {
        let result = data;

        if (selectedAccount !== "ALL") {
            const accName = accounts.find(a => a.id === selectedAccount)?.name;
            if (accName) {
                result = result.filter(item => item.accountName === accName);
            }
        }

        if (dateRange?.from) {
            const fromTime = dateRange.from.getTime();
            // If `to` is not selected, we just filter from that single day
            const toTime = dateRange.to ? dateRange.to.getTime() + 86400000 : fromTime + 86400000;

            result = result.filter(item => {
                const itemTime = new Date(item.rawDate).getTime();
                return itemTime >= fromTime && itemTime <= toTime;
            });
        }

        return result;
    }, [data, accounts, selectedAccount, dateRange]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8">
                <Heading
                    title={`Mouvements (${filteredData.length})`}
                    description="Historique global de toutes les transactions de trésorerie"
                />

                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Tous les comptes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous les comptes</SelectItem>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <DatePickerWithRange
                        date={dateRange}
                        setDate={setDateRange}
                        className="w-[260px] sm:w-[300px]"
                    />
                </div>
            </div>
            <Separator />
            <DataTable  exportTitle={"Export"} exportDescription={""} searchKey="description" columns={columns} data={filteredData} />
        </div>
    )
}
