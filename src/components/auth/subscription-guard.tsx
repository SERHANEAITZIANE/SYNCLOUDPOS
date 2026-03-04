"use client"

import { useEffect, useState } from "react"
import { ShieldAlert, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { Link } from "@/i18n/routing"

interface SubscriptionGuardProps {
    children: React.ReactNode;
    subscriptionEndsAt: Date | null;
    isSuperadmin: boolean;
    isBlocked?: boolean;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
    children,
    subscriptionEndsAt,
    isSuperadmin,
    isBlocked = false
}) => {
    const [isExpired, setIsExpired] = useState(false);
    const [isAccountBlocked, setIsAccountBlocked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isSuperadmin) {
            setIsExpired(false);
            setIsAccountBlocked(false);
            setIsLoading(false);
            return;
        }

        if (isBlocked) {
            setIsAccountBlocked(true);
            setIsLoading(false);
            return;
        }

        if (!subscriptionEndsAt) {
            setIsExpired(false);
        } else {
            const now = new Date();
            const end = new Date(subscriptionEndsAt);
            setIsExpired(now > end);
        }
        setIsLoading(false);
    }, [subscriptionEndsAt, isSuperadmin, isBlocked]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading verification...</div>;
    }

    return <>{children}</>;
}
