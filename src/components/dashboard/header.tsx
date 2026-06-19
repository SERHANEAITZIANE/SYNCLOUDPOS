import { UserNav } from "@/components/dashboard/user-nav";
import { ModeToggle } from "@/components/dashboard/mode-toggle";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { HeaderMobileConnect } from "@/components/dashboard/header-mobile-connect";

import { HeaderStoreSelector } from "./header-store-selector";
import { getStores } from "@/actions/stores";
import { Link } from "@/i18n/routing";
import { Settings, Sparkles, MessageCircle } from "lucide-react";

export async function DashboardHeader({ user }: { user: any }) {
    const stores = await getStores();
    return (
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 gap-2 md:gap-4">
            <MobileSidebar />
            <div className="w-full flex-1">
                {/* Search bar could go here */}
                <form>
                    <div className="relative">
                        {/* <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search products..."
                className="w-full appearance-none bg-[#020205] pl-8 shadow-none md:w-2/3 lg:w-1/3"
                /> */}
                    </div>
                </form>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                <HeaderStoreSelector stores={stores} currentStoreId={user.defaultStoreId} />
                
                <div className="hidden sm:flex items-center gap-1 border-r border-border pr-2 md:pr-4">
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

