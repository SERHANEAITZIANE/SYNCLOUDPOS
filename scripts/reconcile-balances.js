const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== RECONCILING SUPPLIER BALANCES ===");
  const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' }
  });

  console.log(String("").padEnd(30) + " | " + "DB Balance".padStart(12) + " | " + "Tx Sum".padStart(12) + " | " + "Calc Initial".padStart(12));
  console.log("-".repeat(75));

  for (const s of suppliers) {
      const tenantId = s.tenantId;

      // 1. Purchases (impactful/completed)
      const purchases = await prisma.purchaseOrder.findMany({
          where: { 
              tenantId, 
              supplierId: s.id,
              status: { in: ["BON_LIVRAISON", "FACTURE", "COMPLETED"] }
          },
          select: { total: true }
      });
      const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total), 0);

      // 2. Returns
      const returns = await prisma.supplierReturn.findMany({
          where: { tenantId, supplierId: s.id },
          select: { totalAmount: true }
      });
      const totalReturns = returns.reduce((sum, r) => sum + Number(r.totalAmount), 0);

      // 3. Cheques
      const cheques = await prisma.cheque.findMany({
          where: { tenantId, supplierId: s.id },
          select: { id: true }
      });

      // 4. Treasury Transactions
      const purchaseIds = (await prisma.purchaseOrder.findMany({
          where: { tenantId, supplierId: s.id },
          select: { id: true }
      })).map(p => p.id);
      const chequeIds = cheques.map(c => c.id);
      const referenceIds = [s.id, ...purchaseIds, ...chequeIds];

      const txs = await prisma.treasuryTransaction.findMany({
          where: {
              tenantId,
              referenceId: { in: referenceIds }
          },
          select: { amount: true, type: true }
      });

      let totalPayments = 0;
      let totalLoans = 0;

      for (const tx of txs) {
          if (tx.type === "DEBIT") {
              totalPayments += Number(tx.amount);
          } else if (tx.type === "CREDIT") {
              totalLoans += Number(tx.amount);
          }
      }

      // Math: balance = initial + purchases + loans - payments - returns
      // So: tx_sum = purchases + loans - payments - returns
      const txSum = totalPurchases + totalLoans - totalPayments - totalReturns;
      const dbBalance = Number(s.balance);
      const calcInitial = dbBalance - txSum;

      console.log(
          s.name.substring(0, 30).padEnd(30) + " | " +
          dbBalance.toFixed(2).padStart(12) + " | " +
          txSum.toFixed(2).padStart(12) + " | " +
          calcInitial.toFixed(2).padStart(12)
      );
  }

  console.log("\n=== RECONCILING CUSTOMER BALANCES ===");
  const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' }
  });

  console.log(String("").padEnd(30) + " | " + "DB Balance".padStart(12) + " | " + "Tx Sum".padStart(12) + " | " + "Calc Initial".padStart(12));
  console.log("-".repeat(75));

  for (const c of customers) {
      const tenantId = c.tenantId;

      // 1. Sales/Orders (completed/validated/paid/draft etc)
      // Note: for customer ledger, check what is treated as sale/debt increase
      const orders = await prisma.order.findMany({
          where: { tenantId, customerId: c.id, status: { not: "CANCELLED" } },
          select: { total: true }
      });
      const salesOrders = await prisma.salesOrder.findMany({
          where: { tenantId, customerId: c.id, status: { not: "CANCELLED" } },
          select: { total: true }
      });

      const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0) + 
                         salesOrders.reduce((sum, so) => sum + Number(so.total), 0);

      // 2. Returns
      const returns = await prisma.productReturn.findMany({
          where: { tenantId, customerId: c.id },
          select: { totalAmount: true }
      });
      const totalReturns = returns.reduce((sum, r) => sum + Number(r.totalAmount), 0);

      // 3. Cheques
      const cheques = await prisma.cheque.findMany({
          where: { tenantId, customerId: c.id },
          select: { id: true }
      });

      // 4. Treasury Transactions
      const orderIds = (await prisma.order.findMany({
          where: { tenantId, customerId: c.id },
          select: { id: true }
      })).map(o => o.id);
      const salesOrderIds = (await prisma.salesOrder.findMany({
          where: { tenantId, customerId: c.id },
          select: { id: true }
      })).map(so => so.id);
      const chequeIds = cheques.map(ch => ch.id);
      const referenceIds = [c.id, ...orderIds, ...salesOrderIds, ...chequeIds];

      const txs = await prisma.treasuryTransaction.findMany({
          where: {
              tenantId,
              referenceId: { in: referenceIds }
          },
          select: { amount: true, type: true }
      });

      let totalReceived = 0;
      let totalGiven = 0;

      for (const tx of txs) {
          if (tx.type === "CREDIT") {
              totalReceived += Number(tx.amount);
          } else if (tx.type === "DEBIT") {
              totalGiven += Number(tx.amount);
          }
      }

      // Customer Math: balance = initial + sales + loans_given - payments_received - returns
      // So: tx_sum = sales + loans_given - payments_received - returns
      const txSum = totalSales + totalGiven - totalReceived - totalReturns;
      const dbBalance = Number(c.balance);
      const calcInitial = dbBalance - txSum;

      console.log(
          c.name.substring(0, 30).padEnd(30) + " | " +
          dbBalance.toFixed(2).padStart(12) + " | " +
          txSum.toFixed(2).padStart(12) + " | " +
          calcInitial.toFixed(2).padStart(12)
      );
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
