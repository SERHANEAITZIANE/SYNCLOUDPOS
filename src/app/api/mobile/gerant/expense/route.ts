import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile-auth";

// POST /api/mobile/gerant/expense — Quick expense logging from phone
export async function POST(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const tenantId = user.tenantId;
        const body = await req.json();
        const { description, amount, categoryId, accountId, date } = body;

        if (!description || !amount || amount <= 0) {
            return NextResponse.json(
                { error: "Description et montant requis (montant > 0)" },
                { status: 400 }
            );
        }

        // Get or create a default expense category
        let finalCategoryId = categoryId;
        if (!finalCategoryId) {
            // Try to find a "Divers" category or create one
            let category = await db.expenseCategory.findFirst({
                where: { tenantId, name: { contains: "Divers" } },
            });
            if (!category) {
                category = await db.expenseCategory.create({
                    data: { tenantId, name: "Divers", type: "VARIABLE" },
                });
            }
            finalCategoryId = category.id;
        }

        // Get treasury account (default to first CASH account)
        let finalAccountId = accountId;
        if (!finalAccountId) {
            const cashAccount = await db.treasuryAccount.findFirst({
                where: { tenantId, type: "CASH" },
            });
            if (cashAccount) {
                finalAccountId = cashAccount.id;
            }
        }

        // Create the expense
        const expense = await db.expense.create({
            data: {
                tenantId,
                description,
                amount,
                categoryId: finalCategoryId,
                accountId: finalAccountId || null,
                date: date ? new Date(date) : new Date(),
            },
            include: {
                category: { select: { name: true } },
            },
        });

        // Create treasury outflow if account is specified
        if (finalAccountId) {
            const account = await db.treasuryAccount.findUnique({
                where: { id: finalAccountId },
            });

            if (account) {
                const balanceBefore = Number(account.balance);
                const balanceAfter = balanceBefore - amount;

                await db.treasuryAccount.update({
                    where: { id: finalAccountId },
                    data: { balance: { decrement: amount } },
                });

                await db.treasuryTransaction.create({
                    data: {
                        accountId: finalAccountId,
                        tenantId,
                        type: "OUTFLOW",
                        amount,
                        balanceBefore,
                        balanceAfter,
                        source: "EXPENSE",
                        referenceId: expense.id,
                        description: `Dépense mobile: ${description}`,
                    },
                });
            }
        }

        return NextResponse.json({
            success: true,
            expense: {
                id: expense.id,
                description: expense.description,
                amount: Number(expense.amount),
                category: expense.category.name,
                date: expense.date.toISOString().split("T")[0],
            },
        }, { status: 201 });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}

// GET /api/mobile/gerant/expense — List expense categories for the dropdown
export async function GET(req: NextRequest) {
    try {
        const user = requireMobileAuth(req);

        if (!["ADMIN", "MANAGER"].includes(user.role)) {
            return NextResponse.json({ error: "Accès réservé au gérant" }, { status: 403 });
        }

        const [categories, accounts] = await Promise.all([
            db.expenseCategory.findMany({
                where: { tenantId: user.tenantId },
                select: { id: true, name: true, type: true },
                orderBy: { name: "asc" },
            }),
            db.treasuryAccount.findMany({
                where: { tenantId: user.tenantId },
                select: { id: true, name: true, type: true, balance: true },
                orderBy: { name: "asc" },
            }),
        ]);

        return NextResponse.json({
            categories,
            accounts: accounts.map(a => ({
                ...a,
                balance: Math.round(Number(a.balance)),
            })),
        });
    } catch (error) {
        return mobileErrorResponse(error);
    }
}
