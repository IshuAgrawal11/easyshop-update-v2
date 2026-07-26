import { promises as fs } from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://easyshop-mongodb:27017/easyshop';

// Add this line to grab the CDN URL from your environment variables
// Make sure to remove any trailing slashes to prevent double slashes in the final URL
const CDN_URL = (process.env.CDN_URL || '').replace(/\/$/, '');

// Product Schema
const productSchema = new mongoose.Schema({
  _id: { type: String }, 
  originalId: { type: String }, 
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  oldPrice: Number,
  categories: [String],
  image: [String],
  rating: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  shop_category: { type: String, required: true },
  unit_of_measure: String,
  colors: [String],
  sizes: [String]
}, {
  timestamps: true,
  _id: false 
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

// Function to get correct image path based on shop category
function getImagePath(originalPath: string, shopCategory: string): string {
  const fileName = path.basename(originalPath);
  const categoryMap: { [key: string]: string } = {
    electronics: 'gadgetsImages',
    medicine: 'medicineImages',
    grocery: 'groceryImages',
    clothing: 'clothingImages',
    furniture: 'furnitureImages',
    books: 'books',
    beauty: 'makeupImages',
    snacks: 'groceryImages',
    bakery: 'bakeryImages',
    bags: 'bagsImages'
  };
  
  const imageDir = categoryMap[shopCategory] || shopCategory + 'Images';
  
  // Update this to prepend the CDN URL if it exists
  return `${CDN_URL}/${imageDir}/${fileName}`;
}

// This script does `Product.deleteMany({})` before reseeding — guard against
// running it unattended against a database that looks like production.
function assertSafeToWipe(uri: string) {
  const looksProduction = /prod|production/i.test(uri);
  if (looksProduction && !process.argv.includes('--force')) {
    throw new Error(
      'Refusing to wipe and reseed a database whose connection string looks like production. ' +
      'Pass --force if this is really intended.'
    );
  }
}

async function migrateData() {
  try {
    assertSafeToWipe(MONGODB_URI);
    console.log('Attempting to connect to MongoDB at:', MONGODB_URI);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000, 
    });
    
    console.log('Successfully connected to MongoDB');

    const projectRoot = path.resolve(__dirname, '..');
    
    const jsonData = await fs.readFile(
      path.join(projectRoot, '.db', 'db.json'),
      'utf-8'
    );
    const data = JSON.parse(jsonData);

    await Product.deleteMany({});
    console.log('Cleared existing products');

    const usedIds = new Set<string>();

    const products = data.products.map((product: any) => {
      let paddedId = product.id.padStart(10, '0');
      while (usedIds.has(paddedId)) {
        const num = parseInt(paddedId);
        paddedId = (num + 1).toString().padStart(10, '0');
      }
      usedIds.add(paddedId);

      const fixedImages = product.image.map((img: string) => 
        getImagePath(img, product.shop_category)
      );

      return {
        _id: paddedId,
        originalId: paddedId,
        ...product,
        image: fixedImages
      };
    });

    await Product.insertMany(products);
    console.log(`Migrated ${products.length} products`);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateData();