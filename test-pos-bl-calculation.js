const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPosBlCalculation() {
  console.log("=============================================================");
  console.log("🏊 SYNCLOUDPOS - POS BL TRANSACTION & COMMISSION CALCULATION TEST 🏊");
  console.log("=============================================================");
  console.log("Goal: Verify that a POS order correctly generates a SalesOrder (BL)");
  console.log("with the logged-in commercial agent's userId and correct amountPaid,");
  console.log("which then correctly computes commission earnings.");
  console.log("=============================================================\n");

  let tenant, store, seller, customer, category, product, account;
  let createdOrder, createdSalesOrder;

  try {
    // 1. Setup mock tenant
    console.log("[1/6] Setting up test Tenant with 10% commission rate...");
    tenant = await prisma.tenant.create({
      data: {
        name: "POS BL Test Tenant",
        phone: "0550000000",
        commissionMode: "CATEGORY",
        commissionRate: 10
      }
    });
    console.log(`✅ Tenant created: ${tenant.id}`);

    // 2. Setup mock Store & Treasury Account
    console.log("[2/6] Setting up Store & Treasury Account...");
    store = await prisma.store.create({
      data: {
        name: "POS Test Store",
        tenantId: tenant.id
      }
    });
    account = await prisma.treasuryAccount.create({
      data: {
        name: "POS Cashbox",
        type: "CASH",
        balance: 0,
        tenantId: tenant.id
      }
    });
    console.log(`✅ Store and Account created.`);

    // 3. Setup Vendeur (seller user)
    console.log("[3/6] Creating Salesperson (Vendeur)...");
    seller = await prisma.user.create({
      data: {
        name: "POS Commercial Agent",
        email: `pos_vendeur_${Date.now()}@syncloudpos.com`,
        password: "securepassword",
        role: "VENDEUR",
        tenantId: tenant.id,
        defaultStoreId: store.id
      }
    });
    console.log(`✅ Seller created: ${seller.name} (${seller.id})`);

    // 4. Setup Customer & Product
    console.log("[4/6] Creating Customer and Product...");
    customer = await prisma.customer.create({
      data: {
        name: "POS Client",
        clientType: "RETAIL",
        tenantId: tenant.id
      }
    });
    category = await prisma.category.create({
      data: {
        name: "POS Test Category",
        commissionRetail: 10, // 10% commission for retail clients
        tenantId: tenant.id
      }
    });
    product = await prisma.product.create({
      data: {
        name: "POS Item",
        price: 200,
        stock: 100,
        categoryId: category.id,
        tenantId: tenant.id
      }
    });
    console.log(`✅ Customer & Product initialized.`);

    // 5. Execute simulated POS transaction (simulating createOrder action)
    console.log("[5/6] Simulating createOrder transaction (POS checkout)...");
    const userId = seller.id;
    const tenantId = tenant.id;
    const storeIdToUse = store.id;
    const finalCustomerId = customer.id;
    const accountId = account.id;
    const total = 400; // 2 items of 200 DA each
    const subtotal = 400;
    const tvaAmount = 0;
    const stampTax = 0;
    const paymentMethod = "CASH";
    const paidAmount = 300; // Partially paid!
    const status = "COMPLETED";
    const receiptNumber = "BL-POS-001";
    const items = [
      { productId: product.id, quantity: 2, price: 200 }
    ];

    const result = await prisma.$transaction(async (tx) => {
      // Create the Order
      const newOrder = await tx.order.create({
        data: {
          tenantId,
          storeId: storeIdToUse,
          userId,
          customerId: finalCustomerId,
          accountId: accountId || undefined,
          total,
          subtotal,
          tvaAmount,
          stampTax,
          paymentMethod,
          paidAmount,
          status,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              priceHt: item.price,
              tvaRate: 19
            }))
          }
        }
      });

      // Create the SalesOrder (BL) representing this delivery note
      // Using the exact patched code block:
      const salesOrder = await tx.salesOrder.create({
        data: {
          tenantId,
          storeId: storeIdToUse,
          customerId: finalCustomerId,
          userId, // <-- Patched
          amountPaid: paidAmount, // <-- Patched
          type: "ORDER",
          status: "VALIDATED",
          total,
          receiptNumber,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.price
            }))
          }
        }
      });

      return { newOrder, salesOrder };
    });

    createdOrder = result.newOrder;
    createdSalesOrder = result.salesOrder;
    console.log(`✅ POS Order created: ${createdOrder.id}`);
    console.log(`✅ POS SalesOrder (BL) generated: ${createdSalesOrder.id}`);
    console.log(`   * Saved userId: ${createdSalesOrder.userId}`);
    console.log(`   * Saved amountPaid: ${createdSalesOrder.amountPaid}`);

    // Assert that the fields are set correctly
    if (createdSalesOrder.userId !== seller.id) {
      throw new Error(`Assertion Failed: userId is ${createdSalesOrder.userId}, expected ${seller.id}`);
    }
    if (Number(createdSalesOrder.amountPaid) !== paidAmount) {
      throw new Error(`Assertion Failed: amountPaid is ${createdSalesOrder.amountPaid}, expected ${paidAmount}`);
    }
    console.log("👉 ✅ SUCCESS: Transaction saved fields perfectly!");

    // 6. Test Commission Calculation matching commissions.ts
    console.log("\n[6/6] Executing commission calculation on the POS-generated SalesOrder...");
    
    const activeBLs = await prisma.salesOrder.findMany({
      where: {
        tenantId: tenant.id,
        type: "ORDER",
        status: { not: "CANCELLED" },
        userId: { not: null }
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

    console.log(`✅ Found ${activeBLs.length} active SalesOrder(s) for commission calculation.`);

    let totalEarnedCommission = 0;
    for (const order of activeBLs) {
      const customerType = order.customer?.clientType || "RETAIL";
      const orderTotal = Number(order.total);
      const amountPaidVal = Number(order.amountPaid);
      const paymentRatio = orderTotal > 0 ? (amountPaidVal / orderTotal) : 0;

      console.log(`   * Order Total: ${orderTotal} DA`);
      console.log(`   * Amount Paid: ${amountPaidVal} DA`);
      console.log(`   * Payment Ratio: ${(paymentRatio * 100).toFixed(1)}%`);

      let orderMaxCommission = 0;
      for (const item of order.items) {
        let itemRate = tenant.commissionRate ?? 0;
        const productObj = item.product;

        if (tenant.commissionMode === "CATEGORY" && productObj.categoryId && productObj.category) {
          const categoryObj = productObj.category;
          const rate = customerType === "WHOLESALE" ? categoryObj.commissionWholesale :
                       customerType === "RESELLER"  ? categoryObj.commissionReseller :
                       categoryObj.commissionRetail;
          if (rate > 0) itemRate = rate;
        }

        const itemSubtotal = Number(item.unitPrice) * item.quantity;
        const itemComm = (itemSubtotal * itemRate) / 100;
        orderMaxCommission += itemComm;
        console.log(`     - Item: ${productObj.name} | Qty: ${item.quantity} | Rate: ${itemRate}% | Max Commission: ${itemComm} DA`);
      }

      const orderEarned = orderMaxCommission * paymentRatio;
      totalEarnedCommission += orderEarned;
      console.log(`   * Earned Commission on this Order: ${orderEarned.toFixed(2)} DA`);
    }

    // Expected Max Commission: 400 total * 10% categoryRate = 40 DA
    // Payment Ratio: 300 / 400 = 75%
    // Expected Earned Commission: 40 * 0.75 = 30 DA
    console.log(`\n--- Verification Assertions: ---`);
    console.log(`   * Expected Earned Commission: 30.00 DA`);
    console.log(`   * Calculated Earned Commission: ${totalEarnedCommission.toFixed(2)} DA`);

    if (Math.abs(totalEarnedCommission - 30.00) < 0.001) {
      console.log("   👉 ✅ SUCCESS: Commission calculations match expected value perfectly!");
    } else {
      throw new Error(`Commission mismatch! Expected 30.00 DA, got ${totalEarnedCommission.toFixed(2)} DA`);
    }

    console.log("\n=============================================================");
    console.log("🎉 ALL POS BL COMMISSION VALIDATION TESTS PASSED TRIUMPHANTLY!");
    console.log("=============================================================\n");

  } catch (error) {
    console.error("\n❌ TEST FAILED WITH ERROR:", error);
  } finally {
    console.log("Cleaning up test records...");
    try {
      if (createdSalesOrder) {
        await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: createdSalesOrder.id } });
        await prisma.salesOrder.deleteMany({ where: { id: createdSalesOrder.id } });
      }
      if (createdOrder) {
        await prisma.orderItem.deleteMany({ where: { orderId: createdOrder.id } });
        await prisma.order.deleteMany({ where: { id: createdOrder.id } });
      }
      if (product) await prisma.product.delete({ where: { id: product.id } });
      if (category) await prisma.category.delete({ where: { id: category.id } });
      if (customer) await prisma.customer.delete({ where: { id: customer.id } });
      if (seller) await prisma.user.delete({ where: { id: seller.id } });
      if (account) await prisma.treasuryAccount.delete({ where: { id: account.id } });
      if (store) await prisma.store.delete({ where: { id: store.id } });
      if (tenant) await prisma.tenant.delete({ where: { id: tenant.id } });
      console.log("✅ Cleanup finished.");
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError.message);
    }
    await prisma.$disconnect();
  }
}

testPosBlCalculation();
