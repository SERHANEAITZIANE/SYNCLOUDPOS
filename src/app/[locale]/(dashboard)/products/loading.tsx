export default function ProductsLoading() {
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="h-8 w-40 bg-muted rounded-lg animate-pulse" />
                    <div className="h-4 w-56 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-10 w-36 bg-muted rounded-lg animate-pulse" />
            </div>

            <div className="flex items-center gap-2">
                <div className="h-10 flex-1 max-w-sm bg-muted rounded-lg animate-pulse" />
                <div className="h-10 w-28 bg-muted rounded-lg animate-pulse" />
            </div>

            <div className="rounded-xl border bg-card">
                {/* Table header */}
                <div className="border-b px-4 py-3 flex gap-4">
                    {["w-8", "w-12", "flex-1", "w-24", "w-20", "w-20", "w-16", "w-16"].map((w, i) => (
                        <div key={i} className={`h-4 ${w} bg-muted rounded animate-pulse`} />
                    ))}
                </div>
                {/* Table rows */}
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="border-b last:border-0 px-4 py-3 flex items-center gap-4">
                        <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                        <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    )
}
