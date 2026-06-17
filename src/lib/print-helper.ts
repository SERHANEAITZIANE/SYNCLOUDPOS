/**
 * Sets the default printer, executes the print callback, and restores the original default printer.
 */
export async function printWithDefaultPrinter(targetPrinter: string, printCallback: () => void | Promise<void>) {
    if (!targetPrinter || targetPrinter === "default") {
        await printCallback()
        return
    }

    let previousDefault: string | null = null

    try {
        // Get current default printer
        const getRes = await fetch("/api/printers/default")
        if (getRes.ok) {
            const data = await getRes.json()
            if (data.defaultPrinter && data.defaultPrinter !== "default") {
                previousDefault = data.defaultPrinter
            }
        }
    } catch (err) {
        console.error("Failed to fetch current default printer:", err)
    }

    try {
        // Set new default printer
        await fetch("/api/printers/default", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ printerName: targetPrinter })
        })
    } catch (err) {
        console.error("Failed to set default printer:", err)
    }

    // Delay to allow OS/Chrome to recognize the new default printer
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
        await printCallback()
    } finally {
        // Restore original default printer after a delay (to allow the print job to be queued)
        if (previousDefault) {
            setTimeout(async () => {
                try {
                    await fetch("/api/printers/default", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ printerName: previousDefault })
                    })
                } catch (err) {
                    console.error("Failed to restore default printer:", err)
                }
            }, 3000)
        }
    }
}
