"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    Button,
} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { updateMyProfile } from "@/actions/update-user";
import { Loader2, User, CreditCard, Settings, LogOut } from "lucide-react";

export function UserNav({ user }: { user: any }) {
    const t = useTranslations("UserNav");
    const router = useRouter();

    const [profileOpen, setProfileOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [username, setUsername] = useState(user?.username || "");
    const [password, setPassword] = useState("");

    // Sync state with prop updates
    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
            setUsername(user.username || "");
        }
    }, [user]);

    // Keyboard shortcut handler (Shift + Cmd/Ctrl + P to open profile dialog)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
                e.preventDefault();
                setProfileOpen(true);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Le nom complet est requis.");
            return;
        }
        if (!email.trim()) {
            toast.error("L'adresse e-mail est requise.");
            return;
        }

        startTransition(async () => {
            try {
                const res = await updateMyProfile({
                    name: name.trim(),
                    email: email.trim(),
                    username: username.trim(),
                    password: password || undefined
                });

                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success(res.success || "Profil mis à jour !");
                    setPassword("");
                    setProfileOpen(false);
                    router.refresh();
                }
            } catch (err: any) {
                toast.error("Une erreur s'est produite.");
            }
        });
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                            <AvatarFallback className="bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs">
                                {user?.name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-xl shadow-lg border border-slate-100 dark:border-slate-850 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-lg">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-semibold leading-none text-slate-900 dark:text-white flex items-center gap-1.5">
                                {user?.name}
                                {user?.role === "ADMIN" && (
                                    <span className="text-[9px] font-extrabold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90">
                                        Admin
                                    </span>
                                )}
                            </p>
                            <p className="text-xs leading-none text-slate-500 dark:text-slate-400 font-mono truncate">
                                {user?.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuGroup className="p-1">
                        <DropdownMenuItem 
                            onClick={() => setProfileOpen(true)}
                            className="flex items-center justify-between cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 py-2 px-2.5 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-350">
                                <User className="h-3.5 w-3.5 text-indigo-500" />
                                {t("profile")}
                            </span>
                            <DropdownMenuShortcut className="text-[10px] font-mono tracking-widest text-slate-400 opacity-60">⇧⌘P</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => {
                                toast("La facturation est gérée via les licences de votre boutique.", { icon: "💳" });
                                router.push("/superadmin/licenses");
                            }}
                            className="flex items-center justify-between cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 py-2 px-2.5 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-350">
                                <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                                {t("billing")}
                            </span>
                            <DropdownMenuShortcut className="text-[10px] font-mono tracking-widest text-slate-400 opacity-60">⌘B</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => router.push("/settings")}
                            className="flex items-center justify-between cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 py-2 px-2.5 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-350">
                                <Settings className="h-3.5 w-3.5 text-amber-500" />
                                {t("settings")}
                            </span>
                            <DropdownMenuShortcut className="text-[10px] font-mono tracking-widest text-slate-400 opacity-60">⌘S</DropdownMenuShortcut>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem 
                        onClick={() => signOut()}
                        className="flex items-center justify-between cursor-pointer text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 py-2 px-2.5 m-1 transition-colors font-semibold"
                    >
                        <span className="flex items-center gap-2 text-xs">
                            <LogOut className="h-3.5 w-3.5" />
                            {t("logout")}
                        </span>
                        <DropdownMenuShortcut className="text-[10px] font-mono tracking-widest text-red-400 opacity-60">⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Stunning Custom Profile Dialog - SOMETHING SPECIAL! */}
            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                <DialogContent className="sm:max-w-[420px] rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <span className="h-8 w-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <User className="h-5 w-5" />
                            </span>
                            Mon Profil Personnel
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Mettez à jour vos identifiants de connexion, informations personnelles et mot de passe.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveProfile} className="space-y-4 pt-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-350">Nom Complet</Label>
                            <Input
                                placeholder="Votre nom complet..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-10 text-sm font-semibold rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-350">Adresse E-mail</Label>
                            <Input
                                placeholder="votre-email@exemple.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-10 text-sm font-semibold rounded-xl border-slate-200 focus-visible:ring-indigo-500 font-mono"
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-350">Nom d'utilisateur (Username)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-indigo-500">@</span>
                                <Input
                                    placeholder="johndoe"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="h-10 pl-7 text-sm font-semibold rounded-xl border-slate-200 focus-visible:ring-indigo-500 font-mono"
                                    disabled={isPending}
                                />
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                                Identifiant unique non sensible à la casse pour vous connecter rapidement.
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-350">Nouveau Mot de Passe (Optionnel)</Label>
                            <Input
                                placeholder="Laisser vide pour ne pas modifier..."
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-10 text-sm font-semibold rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                                disabled={isPending}
                            />
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                                Au moins 6 caractères si vous désirez le changer.
                            </span>
                        </div>

                        <DialogFooter className="pt-4 flex flex-row items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-850">
                            <Button
                                type="button"
                                variant="ghost"
                                className="rounded-xl h-10 px-4 text-xs font-bold"
                                onClick={() => setProfileOpen(false)}
                                disabled={isPending}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                className="rounded-xl h-10 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement...
                                    </>
                                ) : (
                                    "Enregistrer"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
