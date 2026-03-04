
import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const db = new PrismaClient()

async function main() {
    console.log("Seeding database...")

    // 1. Create Tenant
    const tenant = await db.tenant.create({
        data: {
            name: "Medina Shop",
            address: "123 Rue Didouche Mourad, Algiers",
            phone: "+213 555 123 456"
        }
    })
    console.log("Created Tenant:", tenant.name)

    // 2. Create User
    const password = await hash("admin123", 12)
    const user = await db.user.create({
        data: {
            email: "admin@syncloudpos.com",
            name: "Admin User",
            password,
            role: "ADMIN",
            tenantId: tenant.id
        }
    })
    console.log("Created User: admin@syncloudpos.com / admin123")

    // 3. Create TenantUser join record
    await (db as any).tenantUser.create({
        data: {
            userId: user.id,
            tenantId: tenant.id,
        }
    })
    console.log("Linked User to Tenant via TenantUser")

    // 3b. Create Default Store
    const store = await db.store.create({
        data: {
            name: "Boutique Principale",
            tenantId: tenant.id
        }
    })
    console.log("Created Default Store")

    // 4. Create Categories
    const catElectronics = await db.category.create({
        data: { name: "Electronics", tenantId: tenant.id }
    })
    const catGroceries = await db.category.create({
        data: { name: "Groceries", tenantId: tenant.id }
    })

    // 5. Create Brands
    const brandSamsung = await db.brand.create({
        data: { name: "Samsung", tenantId: tenant.id }
    })
    const brandCocaCola = await db.brand.create({
        data: { name: "Coca-Cola", tenantId: tenant.id }
    })

    // 6. Create Products with barcodes
    const productSamsung = await db.product.create({
        data: {
            name: "Galaxy S24 Ultra",
            description: "Flagship smartphone",
            price: 250000,
            categoryId: catElectronics.id,
            brandId: brandSamsung.id,
            tenantId: tenant.id,
            storeProducts: {
                create: {
                    storeId: store.id,
                    stock: 10,
                }
            }
        }
    })
    await (db as any).barcode.create({
        data: {
            value: "8806094832345",
            label: "EAN-13",
            productId: productSamsung.id
        }
    })

    const productCocaCola = await db.product.create({
        data: {
            name: "Coca-Cola 1L",
            description: "Refreshing drink",
            price: 120,
            categoryId: catGroceries.id,
            brandId: brandCocaCola.id,
            tenantId: tenant.id,
            storeProducts: {
                create: {
                    storeId: store.id,
                    stock: 100,
                }
            }
        }
    })
    await (db as any).barcode.create({
        data: {
            value: "5449000000996",
            label: "EAN-13",
            productId: productCocaCola.id
        }
    })

    console.log("Seeding complete!")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
