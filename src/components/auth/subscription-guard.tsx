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

    if (isAccountBlocked) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8 space-y-6">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="w-10 h-10" />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-800">
                        Compte Suspendu
                    </h1>

                    <p className="text-slate-600">
                        Votre accès à SYNCLOUDPOS a été temporairement suspendu par l'administrateur.
                        Veuillez contacter le support pour plus d'informations.
                    </p>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Developed by AITEE
                        </p>
                        <Button
                            asChild
                            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-medium"
                            size="lg"
                        >
                            <a
                                href="https://wa.me/213553530743?text=Bonjour,%20mon%20compte%20SYNCLOUDPOS%20a%20été%20suspendu."
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Contact WhatsApp (+213 553 53 07 43)
                            </a>
                        </Button>
                    </div>

                    <div className="pt-4 flex justify-center">
                        <Button
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-800"
                            onClick={() => signOut({ callbackUrl: "/login" })}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Déconnexion
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (isExpired) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8 space-y-6">
                    <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="w-10 h-10" />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-800">
                        Abonnement Expiré
                    </h1>

                    <p className="text-slate-600">
                        Votre période d'essai ou d'abonnement pour SYNCLOUDPOS a pris fin.
                        Veuillez contacter le développeur pour prolonger votre accès.
                    </p>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            Developed by AITEE
                        </p>
                        <Button
                            asChild
                            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-medium"
                            size="lg"
                        >
                            <a
                                href="https://wa.me/213553530743?text=Bonjour,%20je%20souhaite%20renouveler%20mon%20abonnement%20SYNCLOUDPOS."
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Contact WhatsApp (+213 553 53 07 43)
                            </a>
                        </Button>
                    </div>

                    <div className="pt-4 flex justify-center">
                        <Button
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-800"
                            onClick={() => signOut({ callbackUrl: "/login" })}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Déconnexion
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
