import { z } from 'zod';

export const SORTABLE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'price',
  'rating',
  'sales',
  'title',
]);

export const productInputSchema = z.object({
  originalId: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  oldPrice: z.number().optional(),
  categories: z.array(z.string()).optional(),
  image: z.array(z.string()).optional(),
  rating: z.number().optional(),
  sales: z.number().optional(),
  amount: z.number(),
  shop_category: z.string(),
  unit_of_measure: z.string().optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
});

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
