export default function PosLoading() {
    return (
        <div className="flex h-[100dvh] flex-col bg-[#f8f9fa] dark:bg-[#0f1115] overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <div className="h-14 border-b bg-white dark:bg-[#18181b] flex items-center px-4 gap-3 shrink-0">
                <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
                <div className="flex-1" />
                <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Cart sidebar skeleton */}
                <div className="hidden lg:flex w-[440px] h-full shrink-0 bg-white dark:bg-[#18181b] border-r border-gray-200 dark:border-gray-800 flex-col p-4 gap-3">
                    <div className="h-10 bg-muted rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                                <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                                </div>
                                <div className="h-5 w-14 bg-muted rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                    <div className="h-12 bg-muted rounded-xl animate-pulse" />
                </div>

                {/* Product grid skeleton */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Search bar */}
                    <div className="px-3 lg:px-6 py-2 lg:py-4 space-y-2 lg:space-y-4">
                        <div className="flex gap-3 max-w-4xl mx-auto w-full">
                            <div className="flex-1 h-10 lg:h-14 bg-muted rounded-xl lg:rounded-[20px] animate-pulse" />
                            <div className="h-10 lg:h-14 w-32 bg-muted rounded-xl lg:rounded-[20px] animate-pulse" />
                        </div>
                        {/* Category pills */}
                        <div className="flex gap-2 overflow-hidden">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-7 lg:h-10 w-20 bg-muted rounded-full animate-pulse shrink-0" />
                            ))}
                        </div>
                    </div>

                    {/* Product grid */}
                    <div className="flex-1 px-3 lg:px-6 overflow-hidden">
                        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 lg:gap-3">
                            {Array.from({ length: 18 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border bg-white dark:bg-[#1e293b] p-2 space-y-2">
                                    <div className="aspect-square bg-muted rounded-xl animate-pulse" />
                                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                                    <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
