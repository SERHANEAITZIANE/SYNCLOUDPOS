import { UserNav } from "@/components/dashboard/user-nav";
import { ModeToggle } from "@/components/dashboard/mode-toggle";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { HeaderMobileConnect } from "@/components/dashboard/header-mobile-connect";

import { HeaderStoreSelector } from "./header-store-selector";
import { getStores } from "@/actions/stores";
import { Link } from "@/i18n/routing";
import { Settings, Sparkles, MessageCircle, Home, Store, LayoutDashboard, ShoppingCart, Package } from "lucide-react";
import { HeaderSearch } from "./header-search";

export async function DashboardHeader({ user }: { user: any }) {
    const stores = await getStores();
    return (
        <header className="flex h-16 items-center justify-between border-b bg-background px-3 md:px-6 gap-2 md:gap-4">
            <div className="flex items-center gap-2">
                <MobileSidebar />
                
                {/* Primary Navigation Badges: Hub & POS */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <Link
                        href="/hub"
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-bold text-xs transition-all border border-blue-500/20 shadow-xs"
                        title="Aller au Hub principal"
                    >
                        <Home className="h-4 w-4" />
                        <span className="inline">Hub</span>
                    </Link>

                    <Link
                        href="/pos"
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-all border border-emerald-500/20 shadow-xs"
                        title="Écran de Caisse POS"
                    >
                        <Store className="h-4 w-4" />
                        <span className="hidden sm:inline">POS / Caisse</span>
                    </Link>

                    <Link
                        href="/dashboard"
                        className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-muted-foreground font-medium text-xs transition-colors"
                        title="Tableau de bord principal"
                    >
                        <LayoutDashboard className="h-4 w-4 text-sky-500" />
                        <span>Dashboard</span>
                    </Link>

                    <Link
                        href="/sales"
                        className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-muted-foreground font-medium text-xs transition-colors"
                        title="Ventes et Bons de Livraison"
                    >
                        <ShoppingCart className="h-4 w-4 text-violet-500" />
                        <span>Ventes</span>
                    </Link>

                    <Link
                        href="/products"
                        className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-muted-foreground font-medium text-xs transition-colors"
                        title="Catalogue Produits"
                    >
                        <Package className="h-4 w-4 text-pink-500" />
                        <span>Produits</span>
                    </Link>
                </div>
            </div>

            <div className="flex-1 max-w-xs md:max-w-sm mx-2">
                <HeaderSearch />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <HeaderStoreSelector stores={stores} currentStoreId={user.defaultStoreId} />
                
                <div className="hidden sm:flex items-center gap-1 border-r border-border pr-2 md:pr-3">
                    <a href="https://wa.me/213696928227" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors" title="Support WhatsApp">
                        <MessageCircle className="h-4.5 w-4.5 text-[#25d366]" />
                    </a>
                    <Link href="/ai" className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors" title="IA / Assistant">
                        <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
                    </Link>
                    <Link href="/settings" className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors" title="Paramètres">
                        <Settings className="h-4.5 w-4.5" />
                    </Link>
                </div>

                <HeaderMobileConnect />
                <NotificationBell />
                <LanguageSwitcher />
                <ModeToggle />
                <UserNav user={user} />
            </div>
        </header>
    );
}
