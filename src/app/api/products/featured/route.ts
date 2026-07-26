import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/lib/models/product';

// Map frontend categories to database categories
const categoryMap: { [key: string]: string } = {
  electronics: 'gadgets',
  gadgets: 'gadgets',
  medicine: 'medicine',
  grocery: 'grocery',
  clothing: 'clothing',
  furniture: 'furniture',
  books: 'books',
  beauty: 'makeup',
  makeup: 'makeup',
  bags: 'bags',
  snacks: 'grocery',
  bakery: 'bakery'
};

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const requestedCategory = searchParams.get('category') || 'electronics';
    const category = categoryMap[requestedCategory] || requestedCategory;

    // Build query based on category
    const query: any = {};
    if (category !== 'all') {
      query.shop_category = category;
    }

    // Get featured products - best sellers based on rating and sales
    const products = await Product.aggregate([
      { $match: query },
      {
        $addFields: {
          score: {
            $multiply: [
              { $ifNull: ['$rating', 0] },  // Rating score
              { $add: [{ $ifNull: ['$sales', 0] }, 1] }  // Sales score (add 1 to avoid multiplication by 0)
            ]
          }
        }
      },
      { $sort: { score: -1 } },
      { $limit: 8 }
    ]);

    return NextResponse.json(products);
  } catch (error) {
    console.error('Featured products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured products' },
      { status: 500 }
    );
  }
}
