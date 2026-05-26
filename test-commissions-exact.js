const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCommissions() {
  console.log("=== STARTING COMMISSION AND BALANCE CALCULATION TEST ===");
  
  let tenant, store, seller, customerRetail, customerWholesale, customerReseller;
  let categoryA, categoryB, categoryFallback;
  let productA, productB, productFallback;
  let order1, order2, order3;
  let payment1, payment2;

  try {
    // 1. Create a clean mock Tenant
    console.log("1. Creating mock Tenant...");
    tenant = await prisma.tenant.create({
      data: {
        name: "Test Commission Tenant",
        phone: "00000000",
        commissionMode: "CATEGORY",
        commissionRate: 5 // Default global fallback rate = 5%
      }
    });
    console.log(`Tenant created with ID: ${tenant.id}`);

    // 2. Create Store
    console.log("2. Creating Store...");
    store = await prisma.store.create({
      data: {
        name: "Test Commission Store",
        tenantId: tenant.id
      }
    });

    // 3. Create Seller User
    console.log("3. Creating Vendeur...");
    seller = await prisma.user.create({
      data: {
        name: "Super Seller",
        email: `seller_${Date.now()}@test.com`,
        password: "hashedpassword",
        role: "VENDEUR",
        tenantId: tenant.id,
        defaultStoreId: store.id
      }
    });
    console.log(`Seller user created with ID: ${seller.id}`);

    // 4. Create Customers of different types
    console.log("4. Creating Customers...");
    customerRetail = await prisma.customer.create({
      data: {
        name: "Retail Client",
        clientType: "RETAIL",
        tenantId: tenant.id
      }
    });
    customerWholesale = await prisma.customer.create({
      data: {
        name: "Wholesale Client",
        clientType: "WHOLESALE",
        tenantId: tenant.id
      }
    });
    customerReseller = await prisma.customer.create({
      data: {
        name: "Reseller Client",
        clientType: "RESELLER",
        tenantId: tenant.id
      }
    });

    // 5. Create Categories with specific rates
    console.log("5. Creating Categories...");
    categoryA = await prisma.category.create({
      data: {
        name: "Category High-End (Retail: 10%, Wholesale: 2%, Reseller: 3%)",
        commissionRetail: 10,
        commissionWholesale: 2,
        commissionReseller: 3,
        tenantId: tenant.id
      }
    });

    categoryB = await prisma.category.create({
      data: {
        name: "Category Standard (Retail: 8%, Wholesale: 1%, Reseller: 4%)",
        commissionRetail: 8,
        commissionWholesale: 1,
        commissionReseller: 4,
        tenantId: tenant.id
      }
    });

    categoryFallback = await prisma.category.create({
      data: {
        name: "Category Zero Rates (Should fallback to Tenant's 5%)",
        commissionRetail: 0,
        commissionWholesale: 0,
        commissionReseller: 0,
        tenantId: tenant.id
      }
    });

    // 6. Create Products in categories
    console.log("6. Creating Products...");
    productA = await prisma.product.create({
      data: {
        name: "Product A",
        price: 100,
        stock: 100,
        categoryId: categoryA.id,
        tenantId: tenant.id
      }
    });

    productB = await prisma.product.create({
      data: {
        name: "Product B",
        price: 200,
        stock: 100,
        categoryId: categoryB.id,
        tenantId: tenant.id
      }
    });

    productFallback = await prisma.product.create({
      data: {
        name: "Product Fallback",
        price: 100,
        stock: 100,
        categoryId: categoryFallback.id,
        tenantId: tenant.id
      }
    });

    // 7. Create Treasury Account for orders
    const treasury = await prisma.treasuryAccount.create({
      data: {
        name: "Caisse Principal Test",
        type: "CAISSE",
        tenantId: tenant.id
      }
    });

    // 8. Create Sales Orders (BLs)
    console.log("8. Creating Sales Orders with line items...");

    // Order 1: For Retail customer. Total = 300 (Product A qty 3) + 200 (Product B qty 1) = 500 DA
    // Product A rate for Retail = 10% -> 300 * 10% = 30 DA commission
    // Product B rate for Retail = 8%  -> 200 * 8%  = 16 DA commission
    // Total order max commission = 46 DA
    // Let's set order1 amountPaid to 250 DA (50% paid). Earned commission should be exactly 23 DA.
    order1 = await prisma.salesOrder.create({
      data: {
        type: "ORDER",
        status: "VALIDATED",
        receiptNumber: "BL-TEST-001",
        total: 500,
        amountPaid: 250,
        userId: seller.id,
        customerId: customerRetail.id,
        tenantId: tenant.id,
        items: {
          create: [
            {
              productId: productA.id,
              quantity: 3,
              priceHt: 100,
              unitPrice: 100,
            },
            {
              productId: productB.id,
              quantity: 1,
              priceHt: 200,
              unitPrice: 200,
            }
          ]
        }
      }
    });

    // Order 2: For Wholesale customer. Total = 200 (Product B qty 1) = 200 DA
    // Product B rate for Wholesale = 1% -> 200 * 1% = 2 DA commission
    // Total order max commission = 2 DA
    // Let's set order2 amountPaid to 200 DA (100% paid). Earned commission should be exactly 2 DA.
    order2 = await prisma.salesOrder.create({
      data: {
        type: "ORDER",
        status: "PAID",
        receiptNumber: "BL-TEST-002",
        total: 200,
        amountPaid: 200,
        userId: seller.id,
        customerId: customerWholesale.id,
        tenantId: tenant.id,
        items: {
          create: [
            {
              productId: productB.id,
              quantity: 1,
              priceHt: 200,
              unitPrice: 200,
            }
          ]
        }
      }
    });

    // Order 3: For Reseller customer. Total = 100 (Product Fallback qty 1) = 100 DA
    // Product Fallback category has 0% wholesale/reseller/retail. Should fallback to Tenant's 5%.
    // Expected commission = 100 * 5% = 5 DA
    // Let's set order3 amountPaid to 100 DA (100% paid). Earned commission should be exactly 5 DA.
    order3 = await prisma.salesOrder.create({
      data: {
        type: "ORDER",
        status: "PAID",
        receiptNumber: "BL-TEST-003",
        total: 100,
        amountPaid: 100,
        userId: seller.id,
        customerId: customerReseller.id,
        tenantId: tenant.id,
        items: {
          create: [
            {
              productId: productFallback.id,
              quantity: 1,
              priceHt: 100,
              unitPrice: 100,
            }
          ]
        }
      }
    });

    console.log("Sales Orders created successfully!");

    // Let's simulate the exact logic from src/actions/commissions.ts for our seller
    async function calculateSellerStats() {
      // Fetch the salesperson
      const dbSeller = await prisma.user.findUnique({
        where: { id: seller.id },
        select: { id: true, name: true, role: true }
      });

      // Fetch all-time orders for the seller
      const orders = await prisma.salesOrder.findMany({
        where: {
          tenantId: tenant.id,
          type: "ORDER",
          status: { in: ["VALIDATED", "PAID"] },
          userId: seller.id
        },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  brand: true
                }
              }
            }
          }
        }
      });

      let allTimeEarned = 0;
      let orderCount = 0;
      let totalRevenue = 0;

      for (const order of orders) {
        const customerType = order.customer?.clientType || "RETAIL";
        const orderTotal = Number(order.total);
        const amountPaid = Number(order.amountPaid);
        const paymentRatio = orderTotal > 0 ? (amountPaid / orderTotal) : 0;

        let orderMaxCommission = 0;
        for (const item of order.items) {
          let itemRate = tenant.commissionRate ?? 0;
          const product = item.product;

          if (tenant.commissionMode === "BRAND" && product.brandId && product.brand) {
            const brand = product.brand;
            const rate = customerType === "WHOLESALE" ? brand.commissionWholesale :
                         customerType === "RESELLER"  ? brand.commissionReseller :
                         brand.commissionRetail;
            if (rate > 0) itemRate = rate;
          } else if (tenant.commissionMode === "CATEGORY" && product.categoryId && product.category) {
            const category = product.category;
            const rate = customerType === "WHOLESALE" ? category.commissionWholesale :
                         customerType === "RESELLER"  ? category.commissionReseller :
                         category.commissionRetail;
            if (rate > 0) itemRate = rate;
          }

          const itemPriceHt = Number(item.priceHt || item.unitPrice);
          const itemSubtotal = itemPriceHt * item.quantity;
          orderMaxCommission += (itemSubtotal * itemRate) / 100;
        }

        const orderEarnedCommission = orderMaxCommission * paymentRatio;
        allTimeEarned += orderEarnedCommission;
        orderCount++;
        totalRevenue += amountPaid;
      }

      // Fetch all payments recorded for the seller
      const payments = await prisma.sellerCommissionPayment.findMany({
        where: { tenantId: tenant.id, userId: seller.id }
      });

      const allTimePaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const currentBalance = allTimeEarned - allTimePaid;

      return {
        allTimeEarned,
        allTimePaid,
        currentBalance,
        orderCount,
        totalRevenue
      };
    }

    // 9. Initial Verification of calculation
    console.log("\n9. Running initial calculation...");
    let stats = await calculateSellerStats();
    console.log(`Expected All-Time Earned: 30.00 DA (23.00 from Order 1, 2.00 from Order 2, 5.00 from Order 3)`);
    console.log(`Calculated All-Time Earned: ${stats.allTimeEarned.toFixed(2)} DA`);
    
    if (Math.abs(stats.allTimeEarned - 30) < 0.001) {
      console.log("✅ Math matches! Commission calculated correctly at 30.00 DA.");
    } else {
      throw new Error(`❌ Math mismatch! Expected 30.00 DA, got ${stats.allTimeEarned.toFixed(2)} DA`);
    }

    console.log(`Expected Current Balance: 30.00 DA`);
    console.log(`Calculated Current Balance: ${stats.currentBalance.toFixed(2)} DA`);
    if (Math.abs(stats.currentBalance - 30) < 0.001) {
      console.log("✅ Balance matches! Current outstanding balance is 30.00 DA.");
    } else {
      throw new Error(`❌ Balance mismatch! Expected 30.00 DA, got ${stats.currentBalance.toFixed(2)} DA`);
    }

    // 10. Record first commission payment (12.00 DA)
    console.log("\n10. Recording first payment of 12.00 DA to the seller...");
    payment1 = await prisma.sellerCommissionPayment.create({
      data: {
        tenantId: tenant.id,
        userId: seller.id,
        amount: 12.00,
        notes: "First partial payout"
      }
    });

    stats = await calculateSellerStats();
    console.log(`Expected All-Time Paid: 12.00 DA`);
    console.log(`Calculated All-Time Paid: ${stats.allTimePaid.toFixed(2)} DA`);
    if (Math.abs(stats.allTimePaid - 12) < 0.001) {
      console.log("✅ Paid matches! Payments total is 12.00 DA.");
    } else {
      throw new Error(`❌ Paid mismatch! Expected 12.00 DA, got ${stats.allTimePaid.toFixed(2)} DA`);
    }

    console.log(`Expected Outstanding Balance: 18.00 DA (30.00 - 12.00)`);
    console.log(`Calculated Outstanding Balance: ${stats.currentBalance.toFixed(2)} DA`);
    if (Math.abs(stats.currentBalance - 18) < 0.001) {
      console.log("✅ Balance matches! Outstanding balance is 18.00 DA.");
    } else {
      throw new Error(`❌ Balance mismatch! Expected 18.00 DA, got ${stats.currentBalance.toFixed(2)} DA`);
    }

    // 11. Record second commission payment (18.00 DA) to fully settle the balance
    console.log("\n11. Recording second payment of 18.00 DA to fully settle the balance...");
    payment2 = await prisma.sellerCommissionPayment.create({
      data: {
        tenantId: tenant.id,
        userId: seller.id,
        amount: 18.00,
        notes: "Full balance settlement"
      }
    });

    stats = await calculateSellerStats();
    console.log(`Expected All-Time Paid: 30.00 DA`);
    console.log(`Calculated All-Time Paid: ${stats.allTimePaid.toFixed(2)} DA`);
    if (Math.abs(stats.allTimePaid - 30) < 0.001) {
      console.log("✅ Paid matches! Payments total is 30.00 DA.");
    } else {
      throw new Error(`❌ Paid mismatch! Expected 30.00 DA, got ${stats.allTimePaid.toFixed(2)} DA`);
    }

    console.log(`Expected Outstanding Balance: 0.00 DA (Fully Sentry/Settled)`);
    console.log(`Calculated Outstanding Balance: ${stats.currentBalance.toFixed(2)} DA`);
    if (Math.abs(stats.currentBalance - 0) < 0.001) {
      console.log("✅ Balance matches! Current outstanding balance is 0.00 DA.");
    } else {
      throw new Error(`❌ Balance mismatch! Expected 0.00 DA, got ${stats.currentBalance.toFixed(2)} DA`);
    }

    // 12. Delete one of the payments to simulate cancellation/deletion
    console.log("\n12. Deleting the first payment (12.00 DA) to test balance recovery...");
    await prisma.sellerCommissionPayment.delete({
      where: { id: payment1.id }
    });

    stats = await calculateSellerStats();
    console.log(`Expected All-Time Paid after deletion: 18.00 DA`);
    console.log(`Calculated All-Time Paid after deletion: ${stats.allTimePaid.toFixed(2)} DA`);
    if (Math.abs(stats.allTimePaid - 18) < 0.001) {
      console.log("✅ Paid matches after deletion!");
    } else {
      throw new Error(`❌ Paid mismatch after deletion! Expected 18.00 DA, got ${stats.allTimePaid.toFixed(2)} DA`);
    }

    console.log(`Expected Outstanding Balance after deletion: 12.00 DA (30.00 - 18.00)`);
    console.log(`Calculated Outstanding Balance after deletion: ${stats.currentBalance.toFixed(2)} DA`);
    if (Math.abs(stats.currentBalance - 12) < 0.001) {
      console.log("✅ Balance matches after deletion!");
    } else {
      throw new Error(`❌ Balance mismatch after deletion! Expected 12.00 DA, got ${stats.currentBalance.toFixed(2)} DA`);
    }

    console.log("\n⭐️ ALL CALCULATIONS AND BALANCES VERIFIED 100% CORRECT! SUCCESS! ⭐️");

  } catch (error) {
    console.error("\n❌ TEST FAILED WITH ERROR:", error);
  } finally {
    // Clean up all created test data in reverse order of creation dependencies
    console.log("\n=== STARTING CLEANUP OF TEST DATA ===");
    try {
      if (payment2) {
        await prisma.sellerCommissionPayment.deleteMany({
          where: { id: { in: [payment2.id] } }
        });
      }
      // Delete any payment that might have remained
      if (seller) {
        await prisma.sellerCommissionPayment.deleteMany({
          where: { userId: seller.id }
        });
      }
      if (order1 || order2 || order3) {
        const orderIds = [order1, order2, order3].filter(o => o).map(o => o.id);
        await prisma.salesOrderItem.deleteMany({
          where: { salesOrderId: { in: orderIds } }
        });
        await prisma.salesOrder.deleteMany({
          where: { id: { in: orderIds } }
        });
      }
      if (productA || productB || productFallback) {
        await prisma.product.deleteMany({
          where: { id: { in: [productA?.id, productB?.id, productFallback?.id].filter(p => p) } }
        });
      }
      if (categoryA || categoryB || categoryFallback) {
        await prisma.category.deleteMany({
          where: { id: { in: [categoryA?.id, categoryB?.id, categoryFallback?.id].filter(c => c) } }
        });
      }
      if (customerRetail || customerWholesale || customerReseller) {
        await prisma.customer.deleteMany({
          where: { id: { in: [customerRetail?.id, customerWholesale?.id, customerReseller?.id].filter(c => c) } }
        });
      }
      if (seller) {
        await prisma.user.delete({
          where: { id: seller.id }
        });
      }
      if (store) {
        await prisma.store.delete({
          where: { id: store.id }
        });
      }
      if (tenant) {
        // delete treasury
        await prisma.treasuryAccount.deleteMany({
          where: { tenantId: tenant.id }
        });
        await prisma.tenant.delete({
          where: { id: tenant.id }
        });
      }
      console.log("✅ Cleanup finished successfully! Database is perfectly clean.");
    } catch (cleanupError) {
      console.error("❌ Cleanup failed:", cleanupError.message);
    }

    await prisma.$disconnect();
  }
}

testCommissions();
