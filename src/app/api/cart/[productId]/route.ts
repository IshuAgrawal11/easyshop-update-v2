import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Cart, { ICartItem } from '@/lib/models/cart';
import Product from '@/lib/models/product';
import { requireAuth } from '@/lib/auth/utils';

const updateQuantitySchema = z.object({
  quantity: z.number().int().positive(),
});

// Update cart item quantity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    await dbConnect();
    const { productId } = await params;

    const parsed = updateQuantitySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }
    const { quantity } = parsed.data;

    const cart = await Cart.findOne({ user: auth.userId });
    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    const itemIndex = cart.items.findIndex(
      (item: ICartItem) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Item not found in cart' },
        { status: 404 }
      );
    }

    const product = await Product.findOne({ originalId: productId });
    if (!product || quantity > product.amount) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      );
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    return NextResponse.json(cart);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message === 'Authentication required' ? error.message : 'Internal Server Error' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}

// Remove item from cart
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    await dbConnect();
    const { productId } = await params;

    const cart = await Cart.findOne({ user: auth.userId });
    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    cart.items = cart.items.filter(
      (item: ICartItem) => item.product.toString() !== productId
    );

    await cart.save();

    return NextResponse.json(cart);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message === 'Authentication required' ? error.message : 'Internal Server Error' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}
