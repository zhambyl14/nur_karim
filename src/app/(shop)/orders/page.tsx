import { redirect } from "next/navigation";

/** /orders → the list lives in the account area */
export default function OrdersIndexPage() {
  redirect("/account/orders");
}
