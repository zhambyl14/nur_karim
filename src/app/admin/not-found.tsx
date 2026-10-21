import { NotFoundView } from "@/components/layout/not-found-view";

/** notFound() inside the admin panel: stays in the admin shell */
export default function AdminNotFound() {
  return <NotFoundView variant="embedded" homeHref="/admin" catalogHref="/admin/books" className="min-h-[60dvh] rounded-3xl" />;
}
