import { z } from "zod";

// Explicit field whitelist for product create/update — prevents mass
// assignment via arbitrary extra fields in the request body.
export const createProductSchema = z.object({
  originalId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  oldPrice: z.number().positive().optional(),
  categories: z.array(z.string()).optional(),
  image: z.array(z.string()).optional(),
  rating: z.number().min(0).max(5).optional(),
  sales: z.number().min(0).optional(),
  amount: z.number().int().min(0),
  shop_category: z.string().min(1),
  unit_of_measure: z.string().optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const SORTABLE_FIELDS = new Set([
  "createdAt",
  "price",
  "rating",
  "sales",
  "title",
]);
