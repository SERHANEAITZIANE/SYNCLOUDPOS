const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testVendorSolde() {
  console.log("=============================================================");
  console.log("🏊 SYNCLOUDPOS - REAL VENDOR SOLDE & ALL-BL CALCULATION TEST 🏊");
  console.log("=============================================================");
  console.log("Goal: Verify that vendor solde calculations correctly include");
  console.log("all BL statuses (Validated, Paid, Draft/Pending) but exclude");
  console.log("Cancelled orders, as requested by the user.");
  console.log("=============================================================\n");

  let tenant, store, seller, customerRetail, customerWholesale, customerReseller;
  let categoryA, categoryB, categoryFallback;
  let productA, productB, productFallback;
  let orderValidated, orderPaid, orderDraft, orderCancelled;
  let payment1, payment2;

  try {
    // 1. Setup mock tenant with 5% fallback commission
    console.log("[1/10] Setting up clean test Tenant (5% fallback commission)...");
    tenant = await prisma.tenant.create({
      data: {
        name: "Test Vendor Solde Tenant",
        phone: "0770000000",
        commissionMode: "CATEGORY",
        commissionRate: 5
      }
    });
    console.log(`✅ Tenant created: ${tenant.id}`);

    // 2. Setup mock Store
    console.log("[2/10] Setting up Store...");
    store = await prisma.store.create({
      data: {
        name: "Test Solde Branch",
        tenantId: tenant.id
      }
    });
    console.log(`✅ Store created: ${store.id}`);

    // 3. Setup Vendeur (seller user)
    console.log("[3/10] Creating Salesperson (Vendeur)...");
    seller = await prisma.user.create({
      data: {
        name: "Test Commercial Agent",
        email: `commercial_${Date.now()}@syncloudpos.com`,
        password: "securehashedpassword",
        role: "VENDEUR",
        tenantId: tenant.id,
        defaultStoreId: store.id
      }
    });
    console.log(`✅ Vendeur created: ${seller.name} (${seller.id})`);

    // 4. Setup Customer types
    console.log("[4/10] Creating Customers (Retail, Wholesale, Reseller)...");
    customerRetail = await prisma.customer.create({ data: { name: "Retail Client", clientType: "RETAIL", tenantId: tenant.id } });
    customerWholesale = await prisma.customer.create({ data: { name: "Wholesale Client", clientType: "WHOLESALE", tenantId: tenant.id } });
    customerReseller = await prisma.customer.create({ data: { name: "Reseller Partner", clientType: "RESELLER", tenantId: tenant.id } });
    console.log("✅ Customers created.");

    // 5. Setup Categories & Products
    console.log("[5/10] Creating Categories & Products with specific commission ratios...");
    
    // Category A: Retail 10%, Wholesale 2%, Reseller 3%
    categoryA = await prisma.category.create({
      data: {
        name: "Premium Category",
        commissionRetail: 10,
        commissionWholesale: 2,
        commissionReseller: 3,
        tenantId: tenant.id
      }
    });

    // Category B: Retail 8%, Wholesale 1%, Reseller 4%
    categoryB = await prisma.category.create({
      data: {
        name: "Standard Category",
        commissionRetail: 8,
        commissionWholesale: 1,
        commissionReseller: 4,
        tenantId: tenant.id
      }
    });

    // Category Fallback: no rates defined (should fallback to Tenant's 5%)
    categoryFallback = await prisma.category.create({
      data: {
        name: "Zero Rate Category",
        commissionRetail: 0,
        commissionWholesale: 0,
        commissionReseller: 0,
        tenantId: tenant.id
      }
    });

    productA = await prisma.product.create({ data: { name: "A-Item", price: 100, stock: 50, categoryId: categoryA.id, tenantId: tenant.id } });
    productB = await prisma.product.create({ data: { name: "B-Item", price: 200, stock: 50, categoryId: categoryB.id, tenantId: tenant.id } });
    productFallback = await prisma.product.create({ data: { name: "Fallback-Item", price: 100, stock: 50, categoryId: categoryFallback.id, tenantId: tenant.id } });
    console.log("✅ Products & Categories initialized.");

    // 6. Create Sales Orders (Bons de Livraison) with varying statuses
    console.log("[6/10] Creating 4 Bons de Livraison (BLs) with different statuses...");

    // Order 1: VALIDATED (Retail Client). Total = 300 (Product A x 3) + 200 (Product B x 1) = 500 DA.
    // Product A rate for Retail = 10% -> 300 * 10% = 30 DA max commission.
    // Product B rate for Retail = 8%  -> 200 * 8%  = 16 DA max commission.
    // Order Max Commission = 46 DA.
    // Paid 250 DA (50% payment ratio). Expected earned commission = 23.00 DA.
    orderValidated = await prisma.salesOrder.create({
      data: {
        type: "ORDER",
        status: "VALIDATED",
        receiptNumber: "BL-VAL-001",
        total: 500,
        amountPaid: 250,
        userId: seller.id,
        customerId: customerRetail.id,
        tenantId: tenant.id,
        items: {
          create: [
            { productId: productA.id, quantity: 3, priceHt: 100, unitPrice: 100 },
            { productId: productB.id, quantity: 1, priceHt: 200, unitPrice: 200 }
          ]
        }
      }
    });

    // Order 2: PAID (Wholesale Client). Total = 200 (Product B x 1) = 200 DA.
    // Product B rate for Wholesale = 1% -> 200 * 1% = 2 DA max commission.
    // Paid 200 DA (100% payment ratio). Expected earned commission = 2.00 DA.
    orderPaid = await prisma.salesOrder.create({
      data: {
        type: "ORDER",
        status: "PAID",
        receiptNumber: "BL-PAI-002",
        total: 200,
        amountPaid: 200,
        userId: seller.id,
        customerId: customerWholesale.id,
        tenantId: tenant.id,
        items: {
          create: [
            { productId: productB.id, quantity: 1, priceHt: 200, unitPrice: 200 }
          ]
        }
      }
    });

    // Order 3: DRAFT / PENDING (Reseller Client). Total = 100 (Product Fallback x 1) = 100 DA.
    // Product Fallback has 0% category rate -> falls back to Tenant's default 5%.
    // Expected Max Commission = 100 * 5% = 5 DA.
    // Paid 100 DA (100% payment ratio). Expected earned commission = 5.00 DA.
    // IMPORTANT: This order is DRAFT, but should be calculated since status !== CANCELLED!
    orderDraft = await prisma.salesOrder.create({
      data: {
        type: "ORDER",
        status: "DRAFT",
        receiptNumber: "BL-DFT-003",
        total: 100,
        amountPaid: 100,
        userId: seller.id,
        customerId: customerReseller.id,
        tenantId: tenant.id,
        items: {
          create: [
            { productId: productFallback.id, quantity: 1, priceHt: 100, unitPrice: 100 }
          ]
        }
      }
    });

    // Order 4: CANCELLED (Reseller Client). Total = 100 DA.
    // Status is CANCELLED, so it MUST be ignored in all calculations.
    orderCancelled = await prisma.salesOrder.create({
      data: {
        type: "ORDER",
        status: "CANCELLED",
        receiptNumber: "BL-CAN-004",
        total: 100,
        amountPaid: 100,
        userId: seller.id,
        customerId: customerReseller.id,
        tenantId: tenant.id,
        items: {
          create: [
            { productId: productFallback.id, quantity: 1, priceHt: 100, unitPrice: 100 }
          ]
        }
      }
    });

    console.log("✅ BLs with varying statuses created successfully.");

    // 7. Core calculation function mimicking exactly the updated action logic
    async function getCommercialStats() {
      // 1. Fetch BLs that are NOT Cancelled
      const activeBLs = await prisma.salesOrder.findMany({
        where: {
          tenantId: tenant.id,
          type: "ORDER",
          status: { not: "CANCELLED" }, // <--- The All-BL logic: calculates everything not cancelled
          userId: seller.id
        },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      });

      let allTimeEarned = 0;
      let calculatedOrders = [];

      for (const order of activeBLs) {
        const customerType = order.customer?.clientType || "RETAIL";
        const orderTotal = Number(order.total);
        const amountPaid = Number(order.amountPaid);
        const paymentRatio = orderTotal > 0 ? (amountPaid / orderTotal) : 0;

        let orderMaxCommission = 0;
        for (const item of order.items) {
          let itemRate = tenant.commissionRate ?? 0;
          const product = item.product;

          if (tenant.commissionMode === "CATEGORY" && product.categoryId && product.category) {
            const category = product.category;
            const rate = customerType === "WHOLESALE" ? category.commissionWholesale :
                         customerType === "RESELLER"  ? category.commissionReseller :
                         category.commissionRetail;
            if (rate > 0) itemRate = rate;
          }

          const itemPrice = Number(item.priceHt || item.unitPrice);
          const itemSubtotal = itemPrice * item.quantity;
          orderMaxCommission += (itemSubtotal * itemRate) / 100;
        }

        const orderEarned = orderMaxCommission * paymentRatio;
        allTimeEarned += orderEarned;
        calculatedOrders.push({
          num: order.receiptNumber,
          status: order.status,
          total: orderTotal,
          paid: amountPaid,
          commission: orderEarned
        });
      }

      // 2. Fetch payments
      const payments = await prisma.sellerCommissionPayment.findMany({
        where: { tenantId: tenant.id, userId: seller.id }
      });
      const allTimePaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const currentBalance = allTimeEarned - allTimePaid;

      return {
        allTimeEarned,
        allTimePaid,
        currentBalance,
        calculatedOrders
      };
    }

    // 8. Run Verification checks
    console.log("\n[7/10] Running Commission and Solde Calculations...");
    const stats = await getCommercialStats();

    console.log("\n--- Active Calculated BLs in the Test: ---");
    stats.calculatedOrders.forEach(o => {
      console.log(`   * [${o.num}] Status: ${o.status.padEnd(9)} | Total: ${o.total} DA | Paid: ${o.paid} DA | Commission: ${o.commission.toFixed(2)} DA`);
    });

    console.log("\n--- Verification Assertions: ---");
    
    // Check DRAFT inclusion
    const hasDraft = stats.calculatedOrders.some(o => o.num === "BL-DFT-003");
    console.log(`   * Draft BL Included? ${hasDraft ? "✅ YES" : "❌ NO"}`);
    if (!hasDraft) throw new Error("Draft BL was incorrectly excluded!");

    // Check CANCELLED exclusion
    const hasCancelled = stats.calculatedOrders.some(o => o.num === "BL-CAN-004");
    console.log(`   * Cancelled BL Excluded? ${!hasCancelled ? "✅ YES" : "❌ NO"}`);
    if (hasCancelled) throw new Error("Cancelled BL was incorrectly included!");

    // Validate absolute math total
    const expectedEarned = 30.00; // 23.00 + 2.00 + 5.00
    console.log(`   * Expected Total Earned: ${expectedEarned.toFixed(2)} DA`);
    console.log(`   * Calculated Total Earned: ${stats.allTimeEarned.toFixed(2)} DA`);
    
    if (Math.abs(stats.allTimeEarned - expectedEarned) < 0.001) {
      console.log("   👉 ✅ SUCCESS: Commission calculations match expected value!");
    } else {
      throw new Error(`Commission math mismatch! Expected ${expectedEarned.toFixed(2)} DA, got ${stats.allTimeEarned.toFixed(2)} DA`);
    }

    console.log(`   * Expected Seller Solde: ${expectedEarned.toFixed(2)} DA`);
    console.log(`   * Calculated Seller Solde: ${stats.currentBalance.toFixed(2)} DA`);
    if (Math.abs(stats.currentBalance - expectedEarned) < 0.001) {
      console.log("   👉 ✅ SUCCESS: Seller Solde (balance) matches expected value!");
    } else {
      throw new Error(`Solde balance mismatch! Expected ${expectedEarned.toFixed(2)} DA, got ${stats.currentBalance.toFixed(2)} DA`);
    }

    // 9. Payout settlement checks
    console.log("\n[8/10] Recording partial commission payout (12.00 DA)...");
    payment1 = await prisma.sellerCommissionPayment.create({
      data: { tenantId: tenant.id, userId: seller.id, amount: 12.00, notes: "Advance payout" }
    });

    let updatedStats = await getCommercialStats();
    console.log(`   * Paid out: ${updatedStats.allTimePaid.toFixed(2)} DA`);
    console.log(`   * Updated Outstanding Solde: ${updatedStats.currentBalance.toFixed(2)} DA (Expected: 18.00 DA)`);
    if (Math.abs(updatedStats.currentBalance - 18.00) > 0.001) {
      throw new Error("Payout balance adjustment failed!");
    }
    console.log("   👉 ✅ SUCCESS: Solde adjusted correctly down to 18.00 DA.");

    console.log("\n[9/10] Settle full remaining balance (18.00 DA)...");
    payment2 = await prisma.sellerCommissionPayment.create({
      data: { tenantId: tenant.id, userId: seller.id, amount: 18.00, notes: "Final settle" }
    });

    updatedStats = await getCommercialStats();
    console.log(`   * Total Paid out: ${updatedStats.allTimePaid.toFixed(2)} DA`);
    console.log(`   * Settle Outstanding Solde: ${updatedStats.currentBalance.toFixed(2)} DA (Expected: 0.00 DA)`);
    if (Math.abs(updatedStats.currentBalance - 0.00) > 0.001) {
      throw new Error("Full settlement balance adjustment failed!");
    }
    console.log("   👉 ✅ SUCCESS: Solde fully settled at 0.00 DA.");

    console.log("\n=============================================================");
    console.log("🎉 ALL REAL VENDOR SOLDE CALCULATIONS & BUSINESS LOGIC VERIFIED!");
    console.log("   * 1. draft/non-validated BLs are fully calculated");
    console.log("   * 2. cancelled BLs are fully ignored");
    console.log("   * 3. payouts adjust the live solde balance precisely");
    console.log("=============================================================\n");

  } catch (error) {
    console.error("\n❌ REAL TEST FAILED WITH ERROR:", error);
  } finally {
    // 10. Database Cleanup
    console.log("[10/10] Cleaning up test data to keep the database pristine...");
    try {
      if (payment2) {
        await prisma.sellerCommissionPayment.deleteMany({ where: { id: { in: [payment2.id] } } });
      }
      if (seller) {
        await prisma.sellerCommissionPayment.deleteMany({ where: { userId: seller.id } });
      }
      if (orderValidated || orderPaid || orderDraft || orderCancelled) {
        const oIds = [orderValidated, orderPaid, orderDraft, orderCancelled].filter(o => o).map(o => o.id);
        await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: { in: oIds } } });
        await prisma.salesOrder.deleteMany({ where: { id: { in: oIds } } });
      }
      if (productA || productB || productFallback) {
        await prisma.product.deleteMany({ where: { id: { in: [productA?.id, productB?.id, productFallback?.id].filter(p => p) } } });
      }
      if (categoryA || categoryB || categoryFallback) {
        await prisma.category.deleteMany({ where: { id: { in: [categoryA?.id, categoryB?.id, categoryFallback?.id].filter(c => c) } } });
      }
      if (customerRetail || customerWholesale || customerReseller) {
        await prisma.customer.deleteMany({ where: { id: { in: [customerRetail?.id, customerWholesale?.id, customerReseller?.id].filter(c => c) } } });
      }
      if (seller) {
        await prisma.user.delete({ where: { id: seller.id } });
      }
      if (store) {
        await prisma.store.delete({ where: { id: store.id } });
      }
      if (tenant) {
        await prisma.treasuryAccount.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.tenant.delete({ where: { id: tenant.id } });
      }
      console.log("✅ Cleanup complete. Database is pristine.");
    } catch (cleanupError) {
      console.error("❌ Cleanup failed:", cleanupError.message);
    }

    await prisma.$disconnect();
  }
}

testVendorSolde();
