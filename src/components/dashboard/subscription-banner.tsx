"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubscriptionBannerProps {
    daysLeft: number;
    isExpired: boolean;
    isBlocked: boolean;
}

export const SubscriptionBanner = ({
    daysLeft,
    isExpired,
    isBlocked
}: SubscriptionBannerProps) => {
    const t = useTranslations("Subscription");

    if (!isExpired && daysLeft > 7) return null;

    return (
        <div className={cn(
            "w-full px-4 py-2 flex items-center justify-between gap-x-4 animate-in fade-in slide-in-from-top-4 duration-500",
            isExpired || isBlocked
                ? "bg-destructive text-destructive-foreground"
                : "bg-amber-500 text-white"
        )}>
            <div className="flex items-center gap-x-2 text-sm font-medium">
                {isExpired || isBlocked ? (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                ) : (
                    <Info className="h-4 w-4 shrink-0" />
                )}
                <p>
                    {isBlocked ? "Votre compte est bloqué par l'administrateur." :
                        isExpired ? t("expiredDescription") :
                            `Attention: Votre abonnement expire dans ${daysLeft} jours.`}
                </p>
            </div>
            <div className="flex items-center gap-x-2">
                <Button size="sm" variant="secondary" className="h-8 text-xs font-bold" asChild>
                    <a href="tel:+213696928227">{t("contactSupport")}</a>
                </Button>
            </div>
        </div>
    );
};
