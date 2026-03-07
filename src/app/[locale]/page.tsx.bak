import { useTranslations } from "next-intl"
import Link from "next/link"
import {
  Store,
  Package,
  Landmark,
  Cpu,
  Truck,
  Users
} from "lucide-react"

export default function HomePage() {
  const t = useTranslations("LandingPage")

  const currentYear = new Date().getFullYear()

  const features = [
    {
      id: "pos",
      icon: Store,
      color: "from-blue-500 to-cyan-400"
    },
    {
      id: "inventory",
      icon: Package,
      color: "from-emerald-500 to-teal-400"
    },
    {
      id: "finance",
      icon: Landmark,
      color: "from-amber-500 to-orange-400"
    },
    {
      id: "ai",
      icon: Cpu,
      color: "from-purple-500 to-fuchsia-400"
    },
    {
      id: "delivery",
      icon: Truck,
      color: "from-rose-500 to-pink-400"
    },
    {
      id: "hr",
      icon: Users,
      color: "from-indigo-500 to-violet-400"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-cyan-500/30">

      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none"></div>
      </div>

      {/* Navbar */}
      <nav className="w-full flex items-center justify-between p-6 max-w-7xl mx-auto backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(34,211,238,0.5)]">S</div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
            SYNCLOUD<span className="text-cyan-400">POS</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            {t("hero.login")}
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {t("hero.cta")}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            <span className="block text-slate-100 drop-shadow-sm">{t("hero.title").split(' ').slice(0, -2).join(' ')}</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 drop-shadow-lg">
              {" " + t("hero.title").split(' ').slice(-2).join(' ')}
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed mb-10">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg hover:scale-105 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all duration-300 ring-1 ring-white/20"
            >
              {t("hero.cta")}
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-medium text-lg hover:bg-white/10 backdrop-blur-md transition-all duration-300"
            >
              {t("hero.login")}
            </Link>
          </div>
        </div>

        {/* Features Showcase */}
        <div className="mt-32 pt-16 border-t border-white/10">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-100">{t("features.title")}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">{t("features.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.id}
                  className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all duration-500 hover:-translate-y-1 overflow-hidden"
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${feature.color}`}></div>

                  <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center bg-gradient-to-br ${feature.color} shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-100 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all">
                    {t(`features.${feature.id}.title`)}
                  </h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    {t(`features.${feature.id}.description`)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA Footer */}
        <div className="mt-32 p-12 rounded-3xl bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-white mb-6">{t("footer.ready")}</h2>
            <Link
              href="/register"
              className="px-8 py-4 rounded-full bg-white text-slate-900 font-bold text-lg hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300"
            >
              {t("footer.cta")}
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-slate-500 text-sm border-t border-white/5 mt-auto">
        {t("footer.copyright", { year: currentYear.toString() })}
      </footer>
    </div>
  )
}

