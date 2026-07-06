"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

function Table({ className, containerClassName, ...props }: React.ComponentProps<"table"> & { containerClassName?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = React.useState(false)
  const [showRightArrow, setShowRightArrow] = React.useState(false)

  const updateArrows = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const { scrollLeft, scrollWidth, clientWidth } = container
    setShowLeftArrow(scrollLeft > 5)
    setShowRightArrow(scrollWidth - clientWidth - scrollLeft > 5)
  }, [])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    updateArrows()
    
    // Set up ResizeObserver to handle dynamically loading/changing data sizes
    const resizeObserver = new ResizeObserver(() => {
      updateArrows()
    })
    resizeObserver.observe(container)
    
    const tableEl = container.querySelector("table")
    if (tableEl) {
      resizeObserver.observe(tableEl)
    }

    container.addEventListener("scroll", updateArrows, { passive: true })
    window.addEventListener("resize", updateArrows, { passive: true })

    return () => {
      resizeObserver.disconnect()
      container.removeEventListener("scroll", updateArrows)
      window.removeEventListener("resize", updateArrows)
    }
  }, [updateArrows])

  const handleScrollClick = (direction: "left" | "right") => {
    const container = containerRef.current
    if (!container) return
    const scrollAmount = Math.min(container.clientWidth * 0.6, 400)
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const container = containerRef.current
    if (!container) return

    const target = e.target as HTMLElement
    const isSelf = target === container
    if (
      target.closest("button") || 
      target.closest("input") || 
      target.closest("select") || 
      target.closest("a") || 
      target.closest("[role=checkbox]") ||
      (!isSelf && target.closest(".cursor-grab"))
    ) {
      return
    }

    container.classList.remove("cursor-grab")
    container.classList.add("cursor-grabbing")

    const startX = e.pageX - container.offsetLeft
    const scrollLeft = container.scrollLeft

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.pageX - container.offsetLeft
      const walk = (x - startX) * 1.5
      container.scrollLeft = scrollLeft - walk
    }

    const handleMouseUp = () => {
      container.classList.remove("cursor-grabbing")
      container.classList.add("cursor-grab")
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div className="relative group/table-wrapper w-full">
      {/* Scroll Left Button */}
      {showLeftArrow && (
        <button
          type="button"
          onClick={() => handleScrollClick("left")}
          className="absolute left-3 top-[50px] z-30 h-9 w-9 rounded-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-xl flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all cursor-pointer no-print focus:outline-hidden focus:ring-2 focus:ring-blue-500/50"
          title="Faire défiler à gauche"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Scroll Right Button */}
      {showRightArrow && (
        <button
          type="button"
          onClick={() => handleScrollClick("right")}
          className="absolute right-3 top-[50px] z-30 h-9 w-9 rounded-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-xl flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all cursor-pointer no-print focus:outline-hidden focus:ring-2 focus:ring-blue-500/50"
          title="Faire défiler à droite"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        data-slot="table-container"
        className={cn(
          "relative w-full overflow-auto cursor-grab active:cursor-grabbing",
          // Firefox styling
          "[scrollbar-width:thin] [scrollbar-color:theme(colors.zinc.400)_transparent] dark:[scrollbar-color:theme(colors.zinc.600)_transparent]",
          // Custom thick & high contrast scrollbar styling for webkit browsers
          "[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5",
          "[&::-webkit-scrollbar-track]:bg-zinc-100/50 dark:[&::-webkit-scrollbar-track]:bg-zinc-900/20 [&::-webkit-scrollbar-track]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:bg-zinc-450 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding",
          "[&::-webkit-scrollbar-thumb:hover]:bg-zinc-650 dark:[&::-webkit-scrollbar-thumb:hover]:bg-zinc-500",
          containerClassName
        )}
      >
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
