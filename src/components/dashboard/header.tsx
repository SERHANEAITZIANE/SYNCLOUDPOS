import { UserNav } from "@/components/dashboard/user-nav";
import { ModeToggle } from "@/components/dashboard/mode-toggle";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { HeaderMobileConnect } from "@/components/dashboard/header-mobile-connect";

import { HeaderStoreSelector } from "./header-store-selector";
import { getStores } from "@/actions/stores";

export async function DashboardHeader({ user }: { user: any }) {
    const stores = await getStores();
    return (
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
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
            <div className="flex items-center gap-4">
                <HeaderStoreSelector stores={stores} currentStoreId={user.defaultStoreId} />
                <HeaderMobileConnect />
                <NotificationBell />
                <LanguageSwitcher />
                <ModeToggle />
                <UserNav user={user} />
            </div>
        </header>
    );
}

