"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";

const BARCODE_PREFIX = "777911";
const BARCODE_LENGTH = 13; // EAN-13 standard

function calculateEAN13Checksum(barcode12: string): number {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(barcode12[i], 10);
        sum += i % 2 === 0 ? digit : digit * 3;
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
}

export const generateNextBarcode = async () => {
    const session = await auth();
    // @ts-expect-error tenantId is not in session type yet
    const tenantId = session?.user?.tenantId;

    if (!tenantId) {
        return { error: "Unauthorized" };
    }

    try {
        // Find the highest barcode that starts with the prefix for this tenant
        const latestProduct = await db.product.findFirst({
            where: {
                tenantId,
                barcodes: {
                    some: {
                        value: {
                            startsWith: BARCODE_PREFIX,
                        }
                    }
                }
            },
            include: {
                barcodes: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        let nextSequence = 1;

        if (latestProduct && latestProduct.barcodes) {
            const autoBarcodes = latestProduct.barcodes
                .filter(b => b.value.startsWith(BARCODE_PREFIX) && b.value.length === BARCODE_LENGTH)
                .map(b => {
                    // Extract the middle sequence (ignoring the last checksum digit)
                    const sequenceStr = b.value.substring(BARCODE_PREFIX.length, BARCODE_LENGTH - 1);
                    return parseInt(sequenceStr, 10);
                })
                .filter(num => !isNaN(num));

            if (autoBarcodes.length > 0) {
                nextSequence = Math.max(...autoBarcodes) + 1;
            }
        }

        // We need 12 digits total before calculating the 13th checksum digit
        // Prefix is 6 digits (e.g. 777911)
        // Sequence should be 6 digits (e.g. 000001)
        const sequenceLength = 6;
        const sequenceString = nextSequence.toString().padStart(sequenceLength, "0");

        const first12Digits = `${BARCODE_PREFIX}${sequenceString}`;
        const checksumDigit = calculateEAN13Checksum(first12Digits);

        const newBarcode = `${first12Digits}${checksumDigit}`;

        return { success: true, barcode: newBarcode };

    } catch (error) {
        console.error("Error generating barcode:", error);
        return { error: "Failed to generate barcode" };
    }
};
