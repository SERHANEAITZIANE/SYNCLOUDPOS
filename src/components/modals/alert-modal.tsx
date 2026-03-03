"use client"

import { useEffect, useState } from "react"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

interface AlertModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    loading: boolean
}

export const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    loading
}) => {
    const [isMounted, setIsMounted] = useState(false)
    const t = useTranslations("AlertModal")

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return null
    }

    return (
        <Modal
            title={t("title")}
            description={t("description")}
            isOpen={isOpen}
            onClose={onClose}
        >
            <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                <Button disabled={loading} variant="outline" onClick={onClose}>
                    {t("cancel")}
                </Button>
                <Button disabled={loading} variant="destructive" onClick={onConfirm}>
                    {t("continue")}
                </Button>
            </div>
        </Modal>
    )
}
