import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Cart, { ICartItem } from '@/lib/models/cart';
import Product from '@/lib/models/product';
import { requireAuth } from '@/lib/auth/utils';

const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

// Get user's cart
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await dbConnect();

    const cart = await Cart.findOne({ user: auth.userId });

    if (!cart) {
      return NextResponse.json({ items: [], total: 0 });
    }

    // Populate product details
    const populatedItems = await Promise.all(
      cart.items.map(async (item: any) => {
        const product = await Product.findOne({ originalId: item.product });
        const itemObj = typeof item.toObject === 'function' ? item.toObject() : item;
        return {
          ...itemObj,
          product: product ? {
            _id: product._id,
            originalId: product.originalId,
            title: product.title,
            price: product.price,
            image: product.image
          } : null
        };
      })
    );

    const populatedCart = {
      ...cart.toObject(),
      items: populatedItems
    };

    return NextResponse.json(populatedCart);
  } catch (error: any) {
    console.error('Cart error:', error);
    return NextResponse.json(
      { error: error.message === 'Authentication required' ? error.message : 'Internal Server Error' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}

// Add/Update cart item
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await dbConnect();

    const parsed = addToCartSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid cart item' }, { status: 400 });
    }
    const { productId, quantity } = parsed.data;

    // Verify product exists and use its real price/stock — never trust a
    // client-supplied price.
    const product = await Product.findOne({ originalId: productId });
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    if (quantity > product.amount) {
      return NextResponse.json(
        { error: `Insufficient stock for ${product.title}` },
        { status: 400 }
      );
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: auth.userId });
    if (!cart) {
      cart = new Cart({
        user: auth.userId,
        items: [],
        total: 0
      });
    }

    // Create cart item
    const cartItem = {
      product: product.originalId,
      quantity,
      price: product.price
    };

    // Find item in cart
    const existingItemIndex = cart.items.findIndex(
      (item: ICartItem) => item.product === product.originalId
    );

    if (existingItemIndex > -1) {
      // Update existing item
      cart.items[existingItemIndex].quantity = quantity;
      cart.items[existingItemIndex].price = product.price;
    } else {
      // Add new item
      cart.items.push(cartItem);
    }

    // Update total
    cart.total = cart.items.reduce((sum: number, item: ICartItem) => sum + (item.price * item.quantity), 0);

    // Save cart
    await cart.save();

    // Populate product details for response
    const populatedItems = await Promise.all(
      cart.items.map(async (item: any) => {
        const product = await Product.findOne({ originalId: item.product });
        const itemObj = typeof item.toObject === 'function' ? item.toObject() : item;
        return {
          ...itemObj,
          product: product ? {
            _id: product._id,
            originalId: product.originalId,
            title: product.title,
            price: product.price,
            image: product.image
          } : null
        };
      })
    );

    const populatedCart = {
      ...cart.toObject(),
      items: populatedItems
    };

    return NextResponse.json(populatedCart);
  } catch (error: any) {
    console.error('Cart error:', error);
    return NextResponse.json(
      { error: error.message === 'Authentication required' ? error.message : 'Internal Server Error' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}

// Clear cart
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await dbConnect();

    await Cart.findOneAndDelete({ user: auth.userId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cart error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}
