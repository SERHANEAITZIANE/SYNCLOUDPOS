import { RegisterForm } from "@/components/auth/register-form"
import { ShoppingBag, Users, BarChart2, Package } from "lucide-react"

const RegisterPage = () => {
    return (
        <div className="min-h-dvh flex">
            {/* Left panel - branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12"
                style={{
                    background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)"
                }}
            >
                {/* Animated blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20 animate-blob"
                        style={{ background: "radial-gradient(circle, #7c3aed, transparent)", animationDelay: "0s" }} />
                    <div className="absolute top-1/3 -left-20 w-96 h-96 rounded-full opacity-15 animate-blob"
                        style={{ background: "radial-gradient(circle, #059669, transparent)", animationDelay: "2s" }} />
                    <div className="absolute -bottom-20 right-1/3 w-72 h-72 rounded-full opacity-20 animate-blob"
                        style={{ background: "radial-gradient(circle, #2563eb, transparent)", animationDelay: "4s" }} />
                    {/* Grid overlay */}
                    <div className="absolute inset-0" style={{
                        backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                        backgroundSize: "60px 60px"
                    }} />
                </div>

                {/* Content */}
                <div className="relative z-10 text-white max-w-md">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                            <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">SyncCloud</h1>
                            <p className="text-xs text-purple-300 font-medium tracking-widest uppercase">Point of Sale</p>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold leading-tight mb-4">
                        Démarrez gratuitement<br />
                        <span style={{ background: "linear-gradient(90deg, #34d399, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            7 jours d&apos;essai.
                        </span>
                    </h2>
                    <p className="text-gray-400 text-lg mb-10">
                        Créez votre espace en moins de 2 minutes. Aucune carte bancaire requise.
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-10">
                        {[
                            { value: "500+", label: "Boutiques" },
                            { value: "99.9%", label: "Uptime" },
                            { value: "24/7", label: "Support" },
                        ].map(({ value, label }) => (
                            <div key={label} className="text-center p-3 rounded-xl"
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <p className="text-xl font-bold text-white">{value}</p>
                                <p className="text-xs text-gray-400">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                        {[
                            { icon: Package, text: "Gestion des produits & stocks" },
                            { icon: Users, text: "Multi-utilisateurs & rôles" },
                            { icon: BarChart2, text: "Analytics & rapports avancés" },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: "rgba(5,150,105,0.2)", border: "1px solid rgba(5,150,105,0.3)" }}>
                                    <Icon className="w-4 h-4 text-emerald-400" />
                                </div>
                                <span className="text-gray-300 text-sm">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel - form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12"
                style={{ background: "#0a0a0f" }}>
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                            <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white font-bold text-lg">SyncCloud POS</span>
                    </div>
                    <RegisterForm />
                </div>
            </div>
        </div>
    )
}

export default RegisterPage
