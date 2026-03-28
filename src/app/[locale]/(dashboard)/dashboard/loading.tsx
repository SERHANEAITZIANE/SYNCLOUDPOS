export default function DashboardLoading() {
    return (
        <div className="flex-col animate-in fade-in duration-300">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-4 md:pt-6">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                    <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
                    <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
                </div>

                {/* Metric cards */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                                <div className="h-5 w-5 bg-muted rounded animate-pulse" />
                            </div>
                            <div className="h-7 w-32 bg-muted rounded animate-pulse" />
                            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* Chart area */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="col-span-4 rounded-xl border bg-card p-6">
                        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-6" />
                        <div className="h-[300px] bg-muted/50 rounded-lg animate-pulse" />
                    </div>
                    <div className="col-span-3 rounded-xl border bg-card p-6">
                        <div className="h-5 w-36 bg-muted rounded animate-pulse mb-6" />
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                                        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                                    </div>
                                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
