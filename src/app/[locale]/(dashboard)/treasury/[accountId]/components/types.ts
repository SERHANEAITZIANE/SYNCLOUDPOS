export type TreasuryTransactionColumn = {
    id: string
    date: string
    rawDate: Date
    type: string
    amount: string
    rawAmount: number
    balanceBefore: string
    rawBalanceBefore: number
    balanceAfter: string
    rawBalanceAfter: number
    source: string
    description: string
    referenceId: string | null
}
