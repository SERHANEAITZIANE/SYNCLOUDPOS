"use client"

import { useEffect, useState } from "react"
import { AlertCircle, X } from "lucide-react"
import { differenceInDays } from "date-fns"

interface ExpirationAlertProps {
    subscriptionEndsAt: Date | null;
}

export const ExpirationAlert: React.FC<ExpirationAlertProps> = ({ subscriptionEndsAt }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

    useEffect(() => {
        if (!subscriptionEndsAt) return;

        const endDate = new Date(subscriptionEndsAt);
        const today = new Date();
        const days = differenceInDays(endDate, today);

        if (days > 0 && days <= 5) {
            setDaysRemaining(days);
            setIsVisible(true);
        }
    }, [subscriptionEndsAt]);

    if (!isVisible || daysRemaining === null) return null;

    return (
        <div className="bg-orange-500 text-white px-4 py-3 shadow-md relative z-50">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="font-medium text-sm sm:text-base">
                        Attention : Votre abonnement expire dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}.
                        Veuillez contacter le support pour éviter toute interruption de service.
                    </p>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="p-1 hover:bg-orange-600 rounded-full transition-colors focus:outline-none"
                    aria-label="Fermer l'alerte"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
