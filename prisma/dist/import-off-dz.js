"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function fetchProductsFromOFF() {
    return __awaiter(this, void 0, void 0, function () {
        var tenant, tenantId, page, keepGoing, totalImported, categoryCache, brandCache, getOrCreateCategory, getOrCreateBrand, res, data, _i, _a, p, exists, cost, price, stock, catId, brandId, productName, newProduct, err_1;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('Starting OpenFoodFacts import for Algerian products...');
                    return [4 /*yield*/, prisma.tenant.findFirst()];
                case 1:
                    tenant = _b.sent();
                    if (!tenant) {
                        console.error('No tenant found. Please create a tenant first.');
                        return [2 /*return*/];
                    }
                    tenantId = tenant.id;
                    console.log("Using tenant: ".concat(tenant.name, " (").concat(tenantId, ")"));
                    page = 1;
                    keepGoing = true;
                    totalImported = 0;
                    categoryCache = new Map();
                    brandCache = new Map();
                    getOrCreateCategory = function (name) { return __awaiter(_this, void 0, void 0, function () {
                        var cleanName, cat;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    cleanName = name ? name.split(',')[0].trim() : "Général";
                                    if (cleanName.length > 50)
                                        cleanName = cleanName.substring(0, 50); // limit length
                                    if (categoryCache.has(cleanName))
                                        return [2 /*return*/, categoryCache.get(cleanName)];
                                    return [4 /*yield*/, prisma.category.findFirst({ where: { name: cleanName, tenantId: tenantId } })];
                                case 1:
                                    cat = _a.sent();
                                    if (!!cat) return [3 /*break*/, 3];
                                    return [4 /*yield*/, prisma.category.create({ data: { name: cleanName, tenantId: tenantId } })];
                                case 2:
                                    cat = _a.sent();
                                    _a.label = 3;
                                case 3:
                                    categoryCache.set(cleanName, cat.id);
                                    return [2 /*return*/, cat.id];
                            }
                        });
                    }); };
                    getOrCreateBrand = function (name) { return __awaiter(_this, void 0, void 0, function () {
                        var cleanName, b;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    cleanName = name ? name.split(',')[0].trim() : "Sans Marque";
                                    if (cleanName.length > 50)
                                        cleanName = cleanName.substring(0, 50); // limit length
                                    if (brandCache.has(cleanName))
                                        return [2 /*return*/, brandCache.get(cleanName)];
                                    return [4 /*yield*/, prisma.brand.findFirst({ where: { name: cleanName, tenantId: tenantId } })];
                                case 1:
                                    b = _a.sent();
                                    if (!!b) return [3 /*break*/, 3];
                                    return [4 /*yield*/, prisma.brand.create({ data: { name: cleanName, tenantId: tenantId } })];
                                case 2:
                                    b = _a.sent();
                                    _a.label = 3;
                                case 3:
                                    brandCache.set(cleanName, b.id);
                                    return [2 /*return*/, b.id];
                            }
                        });
                    }); };
                    _b.label = 2;
                case 2:
                    if (!keepGoing) return [3 /*break*/, 16];
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 14, , 15]);
                    console.log("Fetching page ".concat(page, " (250 products/page)..."));
                    return [4 /*yield*/, fetch("https://dz.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=250&page=".concat(page))];
                case 4:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 5:
                    data = _b.sent();
                    if (!data.products || data.products.length === 0) {
                        keepGoing = false;
                        return [3 /*break*/, 16];
                    }
                    _i = 0, _a = data.products;
                    _b.label = 6;
                case 6:
                    if (!(_i < _a.length)) return [3 /*break*/, 13];
                    p = _a[_i];
                    if (!p.code || !p.product_name)
                        return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.barcode.findFirst({ where: { value: p.code, product: { tenantId: tenantId } } })];
                case 7:
                    exists = _b.sent();
                    if (exists)
                        return [3 /*break*/, 12];
                    cost = Math.floor(Math.random() * 500) + 50;
                    price = cost + Math.floor(cost * 0.3);
                    stock = Math.floor(Math.random() * 200) + 10;
                    return [4 /*yield*/, getOrCreateCategory(p.categories)];
                case 8:
                    catId = _b.sent();
                    return [4 /*yield*/, getOrCreateBrand(p.brands)];
                case 9:
                    brandId = _b.sent();
                    productName = p.product_name;
                    if (productName.length > 80)
                        productName = productName.substring(0, 80); // limit length
                    return [4 /*yield*/, prisma.product.create({
                            data: {
                                name: productName,
                                price: price,
                                cost: cost,
                                stock: stock,
                                minStock: 10,
                                categoryId: catId,
                                brandId: brandId,
                                tenantId: tenantId
                            }
                        })];
                case 10:
                    newProduct = _b.sent();
                    return [4 /*yield*/, prisma.barcode.create({
                            data: {
                                value: p.code,
                                label: 'EAN-13',
                                productId: newProduct.id
                            }
                        })];
                case 11:
                    _b.sent();
                    totalImported++;
                    _b.label = 12;
                case 12:
                    _i++;
                    return [3 /*break*/, 6];
                case 13:
                    console.log("Imported ".concat(totalImported, " new products so far..."));
                    page++;
                    // The API has around ~7.3k products for Algeria, so we stop at page 40 just to be safe (40*250 = 10,000)
                    if (page > 40)
                        keepGoing = false;
                    return [3 /*break*/, 15];
                case 14:
                    err_1 = _b.sent();
                    console.error("Error fetching or parsing:", err_1);
                    keepGoing = false;
                    return [3 /*break*/, 15];
                case 15: return [3 /*break*/, 2];
                case 16:
                    console.log("\n==========================================");
                    console.log("Finished import! Total new imported products: ".concat(totalImported));
                    console.log("==========================================\n");
                    return [2 /*return*/];
            }
        });
    });
}
fetchProductsFromOFF()
    .then(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })
    .catch(function (e) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.error(e);
                return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                process.exit(1);
                return [2 /*return*/];
        }
    });
}); });
