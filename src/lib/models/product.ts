import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  // Seeded/migrated data uses padded numeric strings (e.g. "0000000028") as
  // the id, not real ObjectIds. Without this override, Mongoose defaults _id
  // to ObjectId, fails to cast the string on document hydration, and quietly
  // drops _id (becomes undefined) from every find()/findOne() result.
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

export default mongoose.models.Product || mongoose.model('Product', productSchema);
