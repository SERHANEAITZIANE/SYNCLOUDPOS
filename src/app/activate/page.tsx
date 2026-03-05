"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, Key, Monitor, Copy, Loader2, ShieldCheck } from "lucide-react"

interface LicenseStatus {
    machineId: string
    license: {
        valid: boolean
        plan?: string
        expiry?: string
        daysLeft?: number
        error?: string
    }
}

export default function ActivatePage() {
    const [status, setStatus] = useState<LicenseStatus | null>(null)
    const [licenseKey, setLicenseKey] = useState("")
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)
    const [result, setResult] = useState<{ success?: boolean; error?: string; plan?: string; expiry?: string } | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        fetch("/api/license/status")
            .then(r => r.json())
            .then(data => { setStatus(data); setChecking(false) })
            .catch(() => setChecking(false))
    }, [])

    const copyMachineId = () => {
        if (status?.machineId) {
            navigator.clipboard.writeText(status.machineId)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const activate = async () => {
        if (!licenseKey.trim()) return
        setLoading(true)
        setResult(null)
        try {
            const res = await fetch("/api/license/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ licenseKey: licenseKey.trim() }),
            })
            const data = await res.json()
            if (res.ok) {
                setResult({ success: true, plan: data.plan, expiry: data.expiry })
                setTimeout(() => window.location.href = "/", 2500)
            } else {
                setResult({ error: data.error })
            }
        } catch {
            setResult({ error: "Connection error. Please try again." })
        } finally {
            setLoading(false)
        }
    }

    // Already activated
    if (!checking && status?.license?.valid) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
                    <h1 className="text-2xl font-bold text-white">Already Activated</h1>
                    <p className="text-zinc-400">Plan: {status.license.plan} · {status.license.daysLeft} days remaining</p>
                    <a href="/" className="inline-block mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition">
                        Open App →
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            {/* Background glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[300px] bg-emerald-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                        <ShieldCheck className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Software Activation</h1>
                    <p className="text-zinc-400 mt-2">SYNCLOUDPOS · Local License</p>
                </div>

                {/* Card */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">

                    {/* Machine ID section */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                            <Monitor className="w-4 h-4 text-zinc-400" />
                            Your Machine ID
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-zinc-300 break-all select-all">
                                {checking ? (
                                    <span className="text-zinc-500">Detecting hardware...</span>
                                ) : (
                                    status?.machineId || "Not detected"
                                )}
                            </div>
                            <button
                                onClick={copyMachineId}
                                disabled={checking || !status?.machineId}
                                className="flex-shrink-0 p-3 bg-zinc-800 border border-white/10 rounded-xl hover:bg-zinc-700 transition disabled:opacity-40"
                                title="Copy Machine ID"
                            >
                                {copied ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <Copy className="w-4 h-4 text-zinc-400" />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Send this to <strong className="text-zinc-400">chirpedbeo.online</strong> to receive your license key.
                        </p>
                    </div>

                    <div className="border-t border-white/5" />

                    {/* License key input */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                            <Key className="w-4 h-4 text-zinc-400" />
                            License Key
                        </label>
                        <textarea
                            value={licenseKey}
                            onChange={e => setLicenseKey(e.target.value)}
                            placeholder="Paste your license key here..."
                            rows={4}
                            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 font-mono resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition"
                        />
                    </div>

                    {/* Result message */}
                    {result && (
                        <div className={`rounded-xl p-4 flex items-start gap-3 ${result.success ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                            {result.success ? (
                                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                                {result.success ? (
                                    <>
                                        <p className="text-emerald-300 font-medium">Activation successful!</p>
                                        <p className="text-emerald-400/70 text-sm mt-0.5">
                                            Plan: {result.plan} · Valid until {result.expiry}. Redirecting...
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-red-300 text-sm">{result.error}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Activate button */}
                    <button
                        onClick={activate}
                        disabled={loading || !licenseKey.trim() || result?.success}
                        className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <Key className="w-4 h-4" />
                                Activate License
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-zinc-600 mt-6">
                    Need a license? Contact us at{" "}
                    <a href="https://chirpedbeo.online" className="text-zinc-400 hover:text-white transition">
                        chirpedbeo.online
                    </a>
                </p>
            </div>
        </div>
    )
}
