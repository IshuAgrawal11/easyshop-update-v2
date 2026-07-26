import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Order from '@/lib/models/order';
import Cart from '@/lib/models/cart';
import Product from '@/lib/models/product';
import { requireAuth } from '@/lib/auth/utils';
import { SHIPPING_COST, TAX_COST } from '@/lib/constants/pricing';

// Get user's orders
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const skip = (page - 1) * limit;
    
    const orders = await Order.find({ user: auth.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Populate product details
    const populatedOrders = await Promise.all(
      orders.map(async (order) => {
        const populatedItems = await Promise.all(
          order.items.map(async (item: any) => {
            const product = await Product.findOne({ originalId: item.product });
            const itemObj = typeof item.toObject === 'function' ? item.toObject() : item;
            return {
              ...itemObj,
              product: product ? {
                _id: product._id,
                title: product.title,
                price: product.price,
                image: product.image
              } : null
            };
          })
        );
        
        return {
          ...order.toObject(),
          items: populatedItems
        };
      })
    );
    
    return NextResponse.json({
      orders: populatedOrders,
      page,
      limit
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}

const addressSchema = z.object({
  title: z.string().min(1),
  streetAddress: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().min(1),
});

const createOrderSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  paymentMethod: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'Invalid order items'),
});

// Create new order from cart
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    await dbConnect();

    const parsed = createOrderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid order data' },
        { status: 400 }
      );
    }
    // billingAddress is validated but the Order model has no field for it yet.
    const { shippingAddress, paymentMethod, items } = parsed.data;

    // Re-fetch every product server-side and use its real price/stock —
    // never trust a client-supplied price or quantity for money math.
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findOne({ originalId: item.productId });
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 400 }
        );
      }
      if (item.quantity > product.amount) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.title}` },
          { status: 400 }
        );
      }

      orderItems.push({
        product: product.originalId,
        quantity: item.quantity,
        price: product.price,
      });
      subtotal += product.price * item.quantity;
    }

    const total = subtotal + SHIPPING_COST + TAX_COST;

    // Map shipping address to match schema
    const mappedShippingAddress = {
      fullName: shippingAddress.title,
      address: shippingAddress.streetAddress,
      city: shippingAddress.city,
      postalCode: shippingAddress.zip,
      country: shippingAddress.country,
    };

    const order = await Order.create({
      user: auth.userId,
      items: orderItems,
      total,
      shippingAddress: mappedShippingAddress,
      paymentMethod,
      status: 'pending',
      paymentStatus: 'pending',
    });

    // Clear the cart
    await Cart.findOneAndDelete({ user: auth.userId });

    return NextResponse.json({
      message: 'Order created successfully',
      order,
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: error.message === 'Authentication required' ? 'Authentication required' : 'Failed to create order' },
      { status: error.message === 'Authentication required' ? 401 : 500 }
    );
  }
}
