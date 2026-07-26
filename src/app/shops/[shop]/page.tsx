import ProductGrid from "@/components/ProductGrid";
import SelectedFilters from "@/components/filters/SelectedFilters";
import ProductLoader from "@/components/loader/ProductLoader";
import { Suspense } from "react";

type ShopPageProps = {
  searchParams: Promise<SearchParamsType>;
  params: Promise<{
    shop: string;
    category: string;
  }>;
};

const ShopPage = async ({ params, searchParams }: ShopPageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  return (
    <section className="shop-page">
      <SelectedFilters />
      <Suspense
        key={resolvedSearchParams?.page + resolvedParams.shop + resolvedSearchParams?.q}
        fallback={<ProductLoader />}
      >
        <ProductGrid searchParams={resolvedSearchParams} params={resolvedParams} />
      </Suspense>
    </section>
  );
};

export default ShopPage;
