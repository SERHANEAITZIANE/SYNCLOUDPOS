"use client"

import { useState, useEffect, useTransition } from "react"
import {
    Clock, CheckCircle, XCircle, Phone, Mail, Building2,
    MapPin, Key, Send, RefreshCw, MessageCircle, User, Cpu
} from "lucide-react"
import { getLicenseRequests, approveLicenseRequest, rejectLicenseRequest, getLicenseStats } from "@/actions/license-requests"

type LicenseRequest = Awaited<ReturnType<typeof getLicenseRequests>>[0]
type Stats = Awaited<ReturnType<typeof getLicenseStats>>

const STATUS_CONFIG = {
    PENDING: { label: "Pending", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    APPROVED: { label: "Approved", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    REJECTED: { label: "Rejected", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
}

export default function LicensesPageClient() {
    const [requests, setRequests] = useState<LicenseRequest[]>([])
    const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0 })
    const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING")
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedPlan, setSelectedPlan] = useState("lifetime")
    const [generatedKey, setGeneratedKey] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [loading, setLoading] = useState(true)

    const load = async () => {
        setLoading(true)
        const [reqs, st] = await Promise.all([getLicenseRequests(), getLicenseStats()])
        setRequests(reqs)
        setStats(st)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const filtered = requests.filter(r => filter === "ALL" || r.status === filter)
    const selected = requests.find(r => r.id === selectedId)

    const approve = (id: string) => {
        startTransition(async () => {
            const { licenseKey, request } = await approveLicenseRequest(id, selectedPlan)
            setGeneratedKey(licenseKey)
            await load()
        })
    }

    const reject = (id: string) => {
        startTransition(async () => {
            await rejectLicenseRequest(id)
            setSelectedId(null)
            await load()
        })
    }

    const whatsappShare = (req: LicenseRequest, key: string) => {
        const msg = encodeURIComponent(
            `🔑 *SYNCLOUDPOS License*\n\n` +
            `Bonjour ${req.ownerName},\n` +
            `Votre licence a été activée!\n\n` +
            `*Clé de licence:*\n${key}\n\n` +
            `Collez cette clé dans l'écran d'activation de l'application.\n\n` +
            `*Plan:* ${req.plan === 'lifetime' ? 'Lifetime (à vie)' : req.plan}`
        )
        window.open(`https://wa.me/${req.phone.replace(/\D/g, "")}?text=${msg}`, "_blank")
    }

    const emailShare = (req: LicenseRequest, key: string) => {
        const subject = encodeURIComponent("SYNCLOUDPOS - Clé d'activation")
        const body = encodeURIComponent(
            `Bonjour ${req.ownerName},\n\n` +
            `Votre clé d'activation SYNCLOUDPOS est prête!\n\n` +
            `Clé de licence:\n${key}\n\n` +
            `Étapes:\n` +
            `1. Ouvrez l'application sur votre PC\n` +
            `2. Dans l'écran d'activation, collez la clé ci-dessus\n` +
            `3. Cliquez sur "Activer"\n\n` +
            `Plan: ${req.plan === 'lifetime' ? 'Lifetime (à vie)' : req.plan}\n\n` +
            `Merci pour votre confiance!\nSYNCLOUDPOS`
        )
        window.open(`mailto:${req.email}?subject=${subject}&body=${body}`, "_blank")
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur border-b border-white/5 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">License Requests</h1>
                        <p className="text-xs text-zinc-500">{stats.pending} pending · {stats.approved} approved</p>
                    </div>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Stat pills */}
                <div className="flex gap-2 mt-3">
                    {([["ALL", "All", stats.total], ["PENDING", "Pending", stats.pending], ["APPROVED", "Approved", stats.approved]] as const).map(([key, label, count]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key as typeof filter)}
                            className={`flex-1 py-1.5 text-xs rounded-lg border transition font-medium ${filter === key ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-zinc-400"}`}
                        >
                            {label} ({count})
                        </button>
                    ))}
                    <button
                        onClick={() => setFilter("REJECTED")}
                        className={`flex-1 py-1.5 text-xs rounded-lg border transition font-medium ${filter === "REJECTED" ? "bg-red-600 border-red-500 text-white" : "bg-white/5 border-white/10 text-zinc-400"}`}
                    >
                        Rejected
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="px-4 py-4 space-y-3">
                {loading && (
                    <div className="text-center py-12 text-zinc-500">Loading...</div>
                )}
                {!loading && filtered.length === 0 && (
                    <div className="text-center py-12 text-zinc-500">
                        <Key className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p>No {filter.toLowerCase()} requests</p>
                    </div>
                )}

                {filtered.map(req => {
                    const cfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG]
                    const StatusIcon = cfg.icon
                    const isSelected = selectedId === req.id

                    return (
                        <div
                            key={req.id}
                            className={`rounded-2xl border bg-white/[0.03] overflow-hidden transition ${isSelected ? "border-indigo-500/40" : "border-white/10"}`}
                        >
                            {/* Card header */}
                            <button
                                className="w-full text-left px-4 py-4"
                                onClick={() => {
                                    setSelectedId(isSelected ? null : req.id)
                                    setGeneratedKey(req.licenseKey || null)
                                    setSelectedPlan(req.plan)
                                }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {cfg.label}
                                            </span>
                                            <span className="text-xs text-zinc-500">{new Date(req.createdAt).toLocaleDateString("fr-DZ")}</span>
                                        </div>
                                        <p className="font-semibold text-sm truncate">{req.companyName}</p>
                                        <p className="text-xs text-zinc-400">{req.ownerName} · {req.phone}</p>
                                    </div>
                                    <span className="text-xs text-indigo-400 font-medium capitalize">{req.plan}</span>
                                </div>
                            </button>

                            {/* Expanded details */}
                            {isSelected && (
                                <div className="border-t border-white/5 px-4 py-4 space-y-4">
                                    {/* Info grid */}
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <InfoItem icon={Building2} label="Company" value={req.companyName} />
                                        <InfoItem icon={User} label="Owner" value={req.ownerName} />
                                        <InfoItem icon={Phone} label="Phone" value={req.phone} />
                                        <InfoItem icon={Mail} label="Email" value={req.email} />
                                        {req.address && <InfoItem icon={MapPin} label="Address" value={req.address} />}
                                        {req.wilaya && <InfoItem icon={MapPin} label="Wilaya" value={req.wilaya} />}
                                    </div>

                                    {/* Machine ID */}
                                    <div className="bg-zinc-900/50 rounded-xl p-3">
                                        <div className="flex items-center gap-2 mb-1 text-xs text-zinc-400">
                                            <Cpu className="w-3.5 h-3.5" />
                                            Machine ID
                                        </div>
                                        <p className="font-mono text-xs text-zinc-300 break-all">{req.machineId}</p>
                                    </div>

                                    {/* Generated key */}
                                    {generatedKey && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                                            <div className="flex items-center gap-2 mb-1 text-xs text-emerald-400">
                                                <Key className="w-3.5 h-3.5" />
                                                License Key Generated
                                            </div>
                                            <p className="font-mono text-xs break-all text-emerald-300">{generatedKey}</p>
                                        </div>
                                    )}

                                    {/* Plan selector */}
                                    {req.status === "PENDING" && (
                                        <div>
                                            <label className="text-xs text-zinc-400 mb-1.5 block">License Plan</label>
                                            <select
                                                value={selectedPlan}
                                                onChange={e => setSelectedPlan(e.target.value)}
                                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                            >
                                                <option value="lifetime">♾️ Lifetime (Recommended)</option>
                                                <option value="pro">⭐ Pro — 1 Year</option>
                                                <option value="starter">🔹 Starter — 6 Months</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex flex-col gap-2">
                                        {req.status === "PENDING" && (
                                            <>
                                                <button
                                                    onClick={() => approve(req.id)}
                                                    disabled={isPending}
                                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-semibold text-sm transition"
                                                >
                                                    <Key className="w-4 h-4" />
                                                    {isPending ? "Generating..." : "Generate License"}
                                                </button>
                                                <button
                                                    onClick={() => reject(req.id)}
                                                    disabled={isPending}
                                                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Reject
                                                </button>
                                            </>
                                        )}

                                        {generatedKey && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => whatsappShare(req, generatedKey)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold text-sm transition"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                    WhatsApp
                                                </button>
                                                <button
                                                    onClick={() => emailShare(req, generatedKey)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm transition"
                                                >
                                                    <Send className="w-4 h-4" />
                                                    Email
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof Building2, label: string, value: string }) {
    return (
        <div className="bg-zinc-900/40 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3 text-zinc-500" />
                <span className="text-zinc-500 text-[10px] uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-white text-xs font-medium truncate">{value}</p>
        </div>
    )
}
