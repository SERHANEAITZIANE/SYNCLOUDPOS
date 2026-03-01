const { z } = require('zod')
const ProductSchema = z.object({
    images: z.object({ url: z.string() }).array(),
})
const data = { images: [{ id: "123", url: "http://example.com/img.jpg", productId: "456" }] }
const validated = ProductSchema.safeParse(data)
console.log(validated.data.images)
