import ProductGrid from "@/components/ProductGrid";
import SelectedFilters from "@/components/filters/SelectedFilters";
import ProductLoader from "@/components/loader/ProductLoader";
import { Suspense } from "react";

type CategoryPageProps = {
  searchParams: Promise<SearchParamsType>;
  params: Promise<{
    category: string;
    shop: string;
  }>;
};

const CategoryPage = async ({ params, searchParams }: CategoryPageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  return (
    <section className="category-page">
      <SelectedFilters />
      <Suspense fallback={<ProductLoader />}>
        <ProductGrid searchParams={resolvedSearchParams} params={resolvedParams} />
      </Suspense>
    </section>
  );
};

export default CategoryPage;
