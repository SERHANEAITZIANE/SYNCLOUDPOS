import React from 'react'
import { Toaster } from 'react-hot-toast'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { auth } from "@/auth"
import { SubscriptionGuard } from "@/components/auth/subscription-guard"

export default async function PosLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const messages = await getMessages();
    const session = await auth();

    return (
        <NextIntlClientProvider messages={messages}>
            <SubscriptionGuard
                isSuperadmin={session?.user?.isSuperadmin}
                subscriptionEndsAt={session?.user?.subscriptionEndsAt}
                isBlocked={session?.user?.isBlocked}
            >
                <div className="h-full w-full bg-slate-100 dark:bg-slate-900">
                    {children}
                </div>
            </SubscriptionGuard>
        </NextIntlClientProvider>
    )
}
