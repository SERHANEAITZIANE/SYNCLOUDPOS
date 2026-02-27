import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fetchProductsFromOFF() {
    console.log('Starting OpenFoodFacts import for Algerian products...');

    const tenant = await prisma.tenant.findFirst()
    if (!tenant) {
        console.error('No tenant found. Please create a tenant first.')
        return
    }
    const tenantId = tenant.id
    console.log(`Using tenant: ${tenant.name} (${tenantId})`)

    let page = 1;
    let keepGoing = true;
    let totalImported = 0;

    // We'll cache categories and brands to avoid too many DB queries
    const categoryCache = new Map<string, string>();
    const brandCache = new Map<string, string>();

    const getOrCreateCategory = async (name: string) => {
        let cleanName = name ? name.split(',')[0].trim() : "Général";
        if (cleanName.length > 50) cleanName = cleanName.substring(0, 50); // limit length
        if (categoryCache.has(cleanName)) return categoryCache.get(cleanName)!;

        let cat = await prisma.category.findFirst({ where: { name: cleanName, tenantId } });
        if (!cat) cat = await prisma.category.create({ data: { name: cleanName, tenantId } });
        categoryCache.set(cleanName, cat.id);
        return cat.id;
    };

    const getOrCreateBrand = async (name: string) => {
        let cleanName = name ? name.split(',')[0].trim() : "Sans Marque";
        if (cleanName.length > 50) cleanName = cleanName.substring(0, 50); // limit length
        if (brandCache.has(cleanName)) return brandCache.get(cleanName)!;

        let b = await prisma.brand.findFirst({ where: { name: cleanName, tenantId } });
        if (!b) b = await prisma.brand.create({ data: { name: cleanName, tenantId } });
        brandCache.set(cleanName, b.id);
        return b.id;
    };

    while (keepGoing) {
        try {
            console.log(`Fetching page ${page} (250 products/page)...`);
            const res = await fetch(`https://dz.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=250&page=${page}`);
            const data = await res.json();

            if (!data.products || data.products.length === 0) {
                keepGoing = false;
                break;
            }

            for (const p of data.products) {
                if (!p.code || !p.product_name) continue;

                // Exclude products that already exist
                const exists = await prisma.barcode.findFirst({ where: { value: p.code, product: { tenantId } } });
                if (exists) continue;

                // Generate random price between 50 and 800 DZ
                const cost = Math.floor(Math.random() * 500) + 50;
                const price = cost + Math.floor(cost * 0.3); // 30% margin
                const stock = Math.floor(Math.random() * 200) + 10;

                const catId = await getOrCreateCategory(p.categories);
                const brandId = await getOrCreateBrand(p.brands);

                let productName = p.product_name;
                if (productName.length > 80) productName = productName.substring(0, 80); // limit length

                const newProduct = await prisma.product.create({
                    data: {
                        name: productName,
                        price: price,
                        cost: cost,
                        stock: stock,
                        minStock: 10,
                        categoryId: catId,
                        brandId: brandId,
                        tenantId
                    }
                });

                await prisma.barcode.create({
                    data: {
                        value: p.code,
                        label: 'EAN-13',
                        productId: newProduct.id
                    }
                });

                totalImported++;
            }

            console.log(`Imported ${totalImported} new products so far...`);
            page++;
            // The API has around ~7.3k products for Algeria, so we stop at page 40 just to be safe (40*250 = 10,000)
            if (page > 40) keepGoing = false;
        } catch (err) {
            console.error("Error fetching or parsing:", err);
            keepGoing = false;
        }
    }

    console.log(`\n==========================================`);
    console.log(`Finished import! Total new imported products: ${totalImported}`);
    console.log(`==========================================\n`);
}

fetchProductsFromOFF()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
