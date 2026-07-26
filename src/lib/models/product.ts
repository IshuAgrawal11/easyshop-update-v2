import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  // Products are seeded with a stable custom string id (see scripts/migrate-data.ts),
  // not a Mongo-generated ObjectId — the schema must declare that explicitly so
  // findById()/populate() cast against the real stored type instead of ObjectId.
  _id: {
    type: String
  },
  originalId: {
    type: String,
    required: true,
    unique: true
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  oldPrice: { 
    type: Number 
  },
  categories: [{ 
    type: String 
  }],
  image: [{ 
    type: String 
  }],
  rating: { 
    type: Number, 
    default: 0 
  },
  sales: {
    type: Number,
    default: 0
  },
  amount: { 
    type: Number, 
    required: true 
  },
  shop_category: { 
    type: String, 
    required: true 
  },
  unit_of_measure: { 
    type: String 
  },
  colors: [{ 
    type: String 
  }],
  sizes: [{ 
    type: String 
  }]
}, {
  timestamps: true,
  _id: false
});

// GET /api/products filters/sorts on all three of these.
productSchema.index({ shop_category: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ price: 1 });

export default mongoose.models.Product || mongoose.model('Product', productSchema);
