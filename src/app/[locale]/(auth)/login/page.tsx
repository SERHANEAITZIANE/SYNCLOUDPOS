import { LoginForm } from "@/components/auth/login-form"
import { ShoppingBag, TrendingUp, Shield, Zap } from "lucide-react"

const LoginPage = () => {
    return (
        <div className="min-h-screen flex">
            {/* Left panel - branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12"
                style={{
                    background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)"
                }}
            >
                {/* Animated blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20 animate-blob"
                        style={{ background: "radial-gradient(circle, #7c3aed, transparent)", animationDelay: "0s" }} />
                    <div className="absolute top-1/2 -right-20 w-96 h-96 rounded-full opacity-15 animate-blob"
                        style={{ background: "radial-gradient(circle, #2563eb, transparent)", animationDelay: "2s" }} />
                    <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-20 animate-blob"
                        style={{ background: "radial-gradient(circle, #db2777, transparent)", animationDelay: "4s" }} />
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
                        Gérez votre boutique<br />
                        <span style={{ background: "linear-gradient(90deg, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            intelligemment.
                        </span>
                    </h2>
                    <p className="text-gray-400 text-lg mb-10">
                        La solution POS complète pour les commerçants algériens.
                    </p>

                    {/* Features */}
                    <div className="space-y-4">
                        {[
                            { icon: TrendingUp, text: "Suivi des ventes en temps réel" },
                            { icon: Shield, text: "Sécurisé et multi-utilisateurs" },
                            { icon: Zap, text: "Rapide, simple et efficace" },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)" }}>
                                    <Icon className="w-4 h-4 text-purple-400" />
                                </div>
                                <span className="text-gray-300 text-sm">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Floating card decoration */}
                <div className="absolute bottom-12 right-8 w-48 p-4 rounded-2xl text-white text-sm"
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255,255,255,0.1)"
                    }}>
                    <p className="text-gray-400 text-xs mb-1">Chiffre du jour</p>
                    <p className="text-2xl font-bold">+12.4%</p>
                    <p className="text-green-400 text-xs">↑ vs hier</p>
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
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}

export default LoginPage
