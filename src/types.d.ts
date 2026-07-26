type SearchParamsType = { [key: string]: string | string[] | undefined };

type GroceryProduct = {
  _id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  categories: string[];
  image: string[];
  unit_of_measure: string;
  shop_category: string;
};

type GadgetProduct = {
  _id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  categories: string[];
  image: string[];
  rating: number;
  amount: number;
  shop_category: string;
  unit_of_measure: string;
};

type BakeryProduct = {
  _id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  categories: string[];
  image: string[];
  rating: number;
  amount: number;
  shop_category: string;
  unit_of_measure: string;
};

type ClothingProduct = {
  _id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  categories: string[];
  image: string[];
  rating: number;
  amount: number;
  shop_category: string;
  unit_of_measure: string;
  colors: string[];
  sizes: string[];
};

type MakeupProduct = {
  _id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  categories: string[];
  image: string[];
  rating: number;
  amount: number;
  shop_category: string;
  unit_of_measure: string;
  colors: string[];
};

type BagsProduct = {
  _id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  categories: string[];
  image: string[];
  rating: number;
  amount: number;
  shop_category: string;
  unit_of_measure: string;
  colors: string[];
};

type BooksProduct = {
  _id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  authors: string[];
  categories: string[];
  image: string[];
  rating: number;
  amount: number;
  shop_category: string;
  unit_of_measure: string;
};

type MedicineProduct = {
  _id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  categories: string[];
  image: string[];
  rating: number;
  amount: number;
  shop_category: string;
  unit_of_measure: string;
  colors: string[];
};

type AllProduct =
  | GroceryProduct
  | GadgetProduct
  | BakeryProduct
  | ClothingProduct
  | MakeupProduct
  | BagsProduct
  | BooksProduct
  | MedicineProduct;

// NOTE: this is intentionally an intersection, not a union. It looks like a
// type-theory bug (a real product can't satisfy every category's fields at
// once) but the actual Mongoose Product schema (src/lib/models/product.ts)
// is a single unified schema — every stored product already has all of
// these fields (colors/sizes are just empty arrays for non-clothing items).
// Switching this to a union breaks every component that reads e.g.
// `product.amount`/`product.colors` directly, because the per-category
// types below (GroceryProduct, BooksProduct, ...) don't individually list
// every field the real data always has. Properly fixing this means giving
// each category type the full common field set, which is a larger type
// redesign than a bug-fix pass warrants — left as a follow-up.
type SingleProductType = GroceryProduct &
  GadgetProduct &
  BakeryProduct &
  ClothingProduct &
  MakeupProduct &
  BagsProduct &
  BooksProduct &
  MedicineProduct;
