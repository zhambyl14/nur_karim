import { NotFoundView } from "@/components/layout/not-found-view";

/** notFound() inside the storefront: keep the shop header / footer, no second logo */
export default function ShopNotFound() {
  return <NotFoundView variant="embedded" className="-mb-24 md:mb-0" />;
}
