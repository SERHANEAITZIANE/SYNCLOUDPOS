"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle, Store as StoreIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createStore } from "@/actions/create-store"
import { switchStore } from "@/actions/switch-store"
import { useTransition } from "react"
import { useTranslations } from "next-intl"

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>

interface StoreSwitcherProps extends PopoverTriggerProps {
    items: { label: string; value: string }[]
    activeTenantId?: string
}

export default function StoreSwitcher({
    className,
    items = [],
    activeTenantId
}: StoreSwitcherProps) {
    const t = useTranslations("StoreSwitcher")
    const [open, setOpen] = React.useState(false)
    const [showNewStoreModal, setShowNewStoreModal] = React.useState(false)
    const [isPending, startTransition] = useTransition()
    const [newStoreName, setNewStoreName] = React.useState("")
    const [errorMessage, setErrorMessage] = React.useState("")

    const currentStore = items.find(item => item.value === activeTenantId) || items[0]

    const onStoreSelect = (store: { label: string; value: string }) => {
        setOpen(false)

        // If selecting a different store, switch to it
        if (store.value !== activeTenantId) {
            startTransition(() => {
                switchStore(store.value)
                    .then((data) => {
                        if (data.error) {
                            console.error(data.error)
                        }
                        if (data.success) {
                            window.location.reload()
                        }
                    })
            })
        }
    }

    const onCreateStore = () => {
        setErrorMessage("")
        if (!newStoreName.trim()) return;

        startTransition(() => {
            createStore(newStoreName)
                .then((data) => {
                    if (data.error) {
                        setErrorMessage(data.error)
                    }
                    if (data.success) {
                        setShowNewStoreModal(false)
                        setNewStoreName("")
                        window.location.reload()
                    }
                })
        })
    }

    return (
        <Dialog open={showNewStoreModal} onOpenChange={setShowNewStoreModal}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-label={t("selectStore")}
                        className={cn("w-[200px] justify-between", className)}
                        disabled={isPending}
                    >
                        <StoreIcon className="mr-2 h-4 w-4" />
                        {currentStore?.label || t("selectStore")}
                        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 z-[99999]">
                    <Command>
                        <CommandList>
                            <CommandInput placeholder={t("searchStore")} />
                            <CommandEmpty>{t("noStoreFound")}</CommandEmpty>
                            <CommandGroup heading={t("storesHeading")}>
                                {items.map((store) => (
                                    <CommandItem
                                        key={store.value}
                                        onSelect={() => onStoreSelect(store)}
                                        className="text-sm"
                                    >
                                        <StoreIcon className="mr-2 h-4 w-4" />
                                        {store.label}
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                currentStore?.value === store.value
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                        <CommandSeparator />
                        <CommandList>
                            <CommandGroup>
                                <CommandItem
                                    onSelect={() => {
                                        setOpen(false)
                                        setShowNewStoreModal(true)
                                    }}
                                >
                                    <PlusCircle className="mr-2 h-5 w-5" />
                                    {t("createStore")}
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("createStoreTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("createStoreDesc")}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2 pb-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t("storeNameLabel")}</Label>
                        <Input
                            id="name"
                            placeholder={t("storeNamePlaceholder")}
                            value={newStoreName}
                            onChange={(e) => setNewStoreName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") onCreateStore() }}
                        />
                        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewStoreModal(false)}>{t("cancel")}</Button>
                    <Button onClick={onCreateStore} disabled={isPending}>
                        {isPending ? t("creating") : t("continue")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
