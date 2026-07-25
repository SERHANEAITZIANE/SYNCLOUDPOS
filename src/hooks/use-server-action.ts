"use client"

import { useState } from "react"
import { toast } from "react-hot-toast"

/**
 * Wraps a server action with automatic error/success handling and toast messages.
 *
 * Usage:
 *   const { execute, isPending } = useServerAction(deleteProduct, {
 *     onSuccess: () => router.refresh(),
 *     successMessage: "Produit supprimé"
 *   })
 *
 *   await execute(id)  // or
 *   <button onClick={() => execute(id)}>Delete</button>
 */
export function useServerAction<Arg, Res extends { error?: string; data?: any }>(
    action: (arg: Arg) => Promise<Res>,
    options?: {
        onSuccess?: () => void | Promise<void>
        onError?: (error: string) => void
        successMessage?: string
        errorMessage?: string
    },
) {
    const [isPending, setIsPending] = useState(false)

    const execute = async (arg: Arg): Promise<Res | null> => {
        setIsPending(true)
        try {
            const result = await action(arg)
            if (result?.error) {
                const msg = result.error || options?.errorMessage || "Une erreur est survenue"
                toast.error(msg)
                options?.onError?.(msg)
                return null
            }
            if (options?.successMessage) {
                toast.success(options.successMessage)
            }
            await options?.onSuccess?.()
            return result
        } catch {
            const msg = options?.errorMessage || "Erreur inattendue"
            toast.error(msg)
            options?.onError?.(msg)
            return null
        } finally {
            setIsPending(false)
        }
    }

    return { execute, isPending }
}
