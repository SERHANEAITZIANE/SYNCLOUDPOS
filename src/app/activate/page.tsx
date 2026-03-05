"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertCircle, Key, Monitor, Copy, Loader2, ShieldCheck, Building2, User, Phone, Mail, MapPin, Send } from "lucide-react"

interface LicenseStatus {
    machineId: string
    license: { valid: boolean; plan?: string; expiry?: string; daysLeft?: number; error?: string }
}

type Step = "check" | "register" | "pending" | "activate" | "done"

export default function ActivatePage() {
    const [status, setStatus] = useState<LicenseStatus | null>(null)
    const [checking, setChecking] = useState(true)
    const [step, setStep] = useState<Step>("check")
    const [copied, setCopied] = useState(false)

    // Register form
    const [form, setForm] = useState({ companyName: "", ownerName: "", phone: "", email: "", address: "", wilaya: "" })
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState("")

    // Activate form
    const [licenseKey, setLicenseKey] = useState("")
    const [activating, setActivating] = useState(false)
    const [activateResult, setActivateResult] = useState<{ success?: boolean; error?: string; plan?: string; expiry?: string } | null>(null)

    const VPS_URL = "https://chirpedbeo.online"

    useEffect(() => {
        fetch("/api/license/status")
            .then(r => r.json())
            .then(data => {
                setStatus(data)
                setChecking(false)
                if (data.license?.valid) setStep("done")
                else setStep("register")
            })
            .catch(() => { setChecking(false); setStep("register") })
    }, [])

    const copyMachineId = () => {
        if (status?.machineId) {
            navigator.clipboard.writeText(status.machineId)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const submitRequest = async () => {
        if (!form.companyName || !form.ownerName || !form.phone || !form.email) {
            setSubmitError("Please fill all required fields.")
            return
        }
        setSubmitting(true)
        setSubmitError("")
        try {
            const res = await fetch(`${VPS_URL}/api/license/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, machineId: status?.machineId || "", plan: "lifetime" })
            })
            const data = await res.json()
            if (res.ok || data.pending || data.alreadyApproved) {
                setStep("pending")
            } else {
                setSubmitError(data.error || "Failed to submit. Please try again.")
            }
        } catch {
            setSubmitError("Cannot connect to activation server. Check your internet connection.")
        } finally {
            setSubmitting(false)
        }
    }

    const activate = async () => {
        if (!licenseKey.trim()) return
        setActivating(true)
        setActivateResult(null)
        try {
            const res = await fetch("/api/license/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ licenseKey: licenseKey.trim() })
            })
            const data = await res.json()
            if (res.ok) {
                setActivateResult({ success: true, plan: data.plan, expiry: data.expiry })
                setTimeout(() => window.location.href = "/", 2500)
            } else {
                setActivateResult({ error: data.error })
            }
        } catch {
            setActivateResult({ error: "Connection error." })
        } finally {
            setActivating(false)
        }
    }

    // Already activated
    if (step === "done" && status?.license?.valid) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
                    <h1 className="text-2xl font-bold text-white">Already Activated</h1>
                    <p className="text-zinc-400">Plan: {status.license.plan} {status.license.plan === "lifetime" ? "♾️" : `· ${status.license.daysLeft} days remaining`}</p>
                    <a href="/" className="inline-block mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition">Open App →</a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-3">
                        <ShieldCheck className="w-7 h-7 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">SYNCLOUDPOS</h1>
                    <p className="text-zinc-500 text-sm">Software Activation</p>
                </div>

                {/* Step: Register (send request) */}
                {(step === "register" || step === "pending") && (
                    <div className="bg-white/[0.03] backdrop-blur border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5">

                        {/* Machine ID */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                                <Monitor className="w-3.5 h-3.5" />Your Machine ID
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 font-mono text-[10px] text-zinc-400 break-all select-all">
                                    {checking ? "Detecting..." : status?.machineId || "Not detected"}
                                </div>
                                <button onClick={copyMachineId} className="p-2.5 bg-zinc-800 border border-white/10 rounded-xl hover:bg-zinc-700 transition">
                                    {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                                </button>
                            </div>
                        </div>

                        {step === "pending" ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center space-y-2">
                                <CheckCircle className="w-8 h-8 text-amber-400 mx-auto" />
                                <p className="text-amber-300 font-semibold">Request Sent!</p>
                                <p className="text-amber-400/70 text-xs">You&apos;ll receive your license key via WhatsApp or email. Then click &quot;Enter License Key&quot; below.</p>
                                <button
                                    onClick={() => setStep("activate")}
                                    className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-xl font-semibold transition"
                                >
                                    I have my license key →
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="border-t border-white/5" />
                                <p className="text-xs text-zinc-400">Fill in your info and we&apos;ll send your activation key via <strong className="text-white">WhatsApp or email</strong>.</p>

                                {/* Form */}
                                <div className="space-y-3">
                                    <InputField icon={Building2} placeholder="Company Name *" value={form.companyName} onChange={v => setForm(p => ({ ...p, companyName: v }))} />
                                    <InputField icon={User} placeholder="Owner Name *" value={form.ownerName} onChange={v => setForm(p => ({ ...p, ownerName: v }))} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField icon={Phone} placeholder="Phone *" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} type="tel" />
                                        <InputField icon={Mail} placeholder="Email *" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} type="email" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField icon={MapPin} placeholder="Address" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} />
                                        <InputField icon={MapPin} placeholder="Wilaya" value={form.wilaya} onChange={v => setForm(p => ({ ...p, wilaya: v }))} />
                                    </div>
                                </div>

                                {submitError && (
                                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{submitError}
                                    </div>
                                )}

                                <button
                                    onClick={submitRequest}
                                    disabled={submitting}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {submitting ? "Sending request..." : "Request Activation"}
                                </button>

                                <button onClick={() => setStep("activate")} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition py-1">
                                    Already have a key? Enter it here →
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Step: Enter license key */}
                {step === "activate" && (
                    <div className="bg-white/[0.03] backdrop-blur border border-white/10 rounded-2xl p-5 shadow-2xl space-y-5">
                        <div>
                            <h2 className="font-semibold text-white flex items-center gap-2"><Key className="w-4 h-4 text-indigo-400" />Enter License Key</h2>
                            <p className="text-xs text-zinc-500 mt-1">Paste the key you received via WhatsApp or email.</p>
                        </div>
                        <textarea
                            value={licenseKey}
                            onChange={e => setLicenseKey(e.target.value)}
                            placeholder="Paste license key here..."
                            rows={4}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 font-mono resize-none focus:outline-none focus:border-indigo-500/50 transition"
                        />
                        {activateResult && (
                            <div className={`rounded-xl p-3 flex items-start gap-2 text-sm ${activateResult.success ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                                {activateResult.success ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
                                <span className={activateResult.success ? "text-emerald-300" : "text-red-300"}>
                                    {activateResult.success ? `Activated! Plan: ${activateResult.plan}. Redirecting...` : activateResult.error}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={activate}
                            disabled={activating || !licenseKey.trim()}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition"
                        >
                            {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                            {activating ? "Verifying..." : "Activate License"}
                        </button>
                        <button onClick={() => setStep("register")} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition py-1">
                            ← Back to registration
                        </button>
                    </div>
                )}

                <p className="text-center text-xs text-zinc-600 mt-5">
                    Need help? <a href="https://chirpedbeo.online" className="text-zinc-400 hover:text-white">chirpedbeo.online</a>
                </p>
            </div>
        </div>
    )
}

function InputField({ icon: Icon, placeholder, value, onChange, type = "text" }: {
    icon: typeof Building2, placeholder: string, value: string,
    onChange: (v: string) => void, type?: string
}) {
    return (
        <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition"
            />
        </div>
    )
}
