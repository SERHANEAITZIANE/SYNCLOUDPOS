/**
 * serializeData
 * Recursively converts Prisma Decimal objects to standard JS numbers and Date objects to ISO strings,
 * preventing Next.js Server Action serialization errors without the overhead of JSON.parse(JSON.stringify()).
 */
export function serializeData<T>(obj: T): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle array
    if (Array.isArray(obj)) {
        return obj.map(item => serializeData(item));
    }

    // Handle object
    if (typeof obj === "object") {
        // Date handling
        if (obj instanceof Date) {
            return obj.toISOString();
        }

        // Prisma Decimal handling (dynamic duck-typing check to avoid strict path imports)
        const constructorName = obj.constructor?.name;
        if (
            (constructorName === "Decimal" || constructorName === "d") &&
            typeof (obj as any).toNumber === "function"
        ) {
            return (obj as any).toNumber();
        }

        // Traverse object keys
        const result: any = {};
        for (const key of Object.keys(obj)) {
            result[key] = serializeData((obj as any)[key]);
        }
        return result;
    }

    // Primitive values
    return obj;
}
