import { useRef, useCallback, useEffect } from "react"

interface UseSwipeOptions {
    onSwipeLeft?: () => void
    onSwipeRight?: () => void
    onSwipeUp?: () => void
    onSwipeDown?: () => void
    onLongPress?: () => void
    threshold?: number
    longPressDelay?: number
    preventDefaultTouchmoveEvent?: boolean
}

interface UseSwipeReturn {
    ref: React.RefObject<HTMLDivElement>
}

export function useSwipe({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    threshold = 50,
    longPressDelay = 500,
    preventDefaultTouchmoveEvent = false,
}: UseSwipeOptions): UseSwipeReturn {
    const ref = useRef<HTMLDivElement>(null)

    const touchStartX = useRef<number>(0)
    const touchStartY = useRef<number>(0)
    const touchEndX = useRef<number>(0)
    const touchEndY = useRef<number>(0)
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const didSwipe = useRef(false)

    const clearLongPress = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current)
            longPressTimer.current = null
        }
    }, [])

    const handleTouchStart = useCallback(
        (e: TouchEvent) => {
            const touch = e.touches[0]
            touchStartX.current = touch.clientX
            touchStartY.current = touch.clientY
            touchEndX.current = touch.clientX
            touchEndY.current = touch.clientY
            didSwipe.current = false

            if (onLongPress) {
                longPressTimer.current = setTimeout(() => {
                    if (!didSwipe.current) {
                        onLongPress()
                    }
                }, longPressDelay)
            }
        },
        [onLongPress, longPressDelay]
    )

    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            if (preventDefaultTouchmoveEvent) {
                e.preventDefault()
            }
            const touch = e.touches[0]
            touchEndX.current = touch.clientX
            touchEndY.current = touch.clientY

            const dx = Math.abs(touchEndX.current - touchStartX.current)
            const dy = Math.abs(touchEndY.current - touchStartY.current)

            if (dx > 10 || dy > 10) {
                didSwipe.current = true
                clearLongPress()
            }
        },
        [preventDefaultTouchmoveEvent, clearLongPress]
    )

    const handleTouchEnd = useCallback(() => {
        clearLongPress()

        const dx = touchEndX.current - touchStartX.current
        const dy = touchEndY.current - touchStartY.current
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)

        if (Math.max(absDx, absDy) < threshold) return

        if (absDx > absDy) {
            // Horizontal swipe
            if (dx > 0) {
                onSwipeRight?.()
            } else {
                onSwipeLeft?.()
            }
        } else {
            // Vertical swipe
            if (dy > 0) {
                onSwipeDown?.()
            } else {
                onSwipeUp?.()
            }
        }
    }, [clearLongPress, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const opts = preventDefaultTouchmoveEvent
            ? { passive: false }
            : { passive: true }

        el.addEventListener("touchstart", handleTouchStart, { passive: true })
        el.addEventListener("touchmove", handleTouchMove, opts)
        el.addEventListener("touchend", handleTouchEnd, { passive: true })

        return () => {
            el.removeEventListener("touchstart", handleTouchStart)
            el.removeEventListener("touchmove", handleTouchMove)
            el.removeEventListener("touchend", handleTouchEnd)
            clearLongPress()
        }
    }, [handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPress, preventDefaultTouchmoveEvent])

    return { ref }
}
