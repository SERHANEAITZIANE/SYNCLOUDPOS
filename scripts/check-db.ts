
import { db } from "../src/lib/db"

async function main() {
    try {
        console.log("Connecting to database...")
        const count = await db.user.count()
        console.log("Successfully connected! User count:", count)
    } catch (error) {
        console.error("Failed to connect:", error)
    } finally {
        await db.$disconnect()
    }
}

main()
