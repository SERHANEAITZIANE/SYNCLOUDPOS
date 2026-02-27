import React from 'react'
import { Toaster } from 'react-hot-toast'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

export default async function PosLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const messages = await getMessages();
    return (
        <NextIntlClientProvider messages={messages}>
            <div className="h-full w-full bg-slate-100 dark:bg-slate-900">
                {children}
            </div>
        </NextIntlClientProvider>
    )
}
