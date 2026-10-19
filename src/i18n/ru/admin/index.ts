import type { Dictionary } from "../../kk";
import nav from "./nav";
import dashboard from "./dashboard";
import orders from "./orders";
import customers from "./customers";
import reviews from "./reviews";
import settings from "./settings";
import books from "./books";
import genres from "./genres";
import promotions from "./promotions";
import promoCodes from "./promoCodes";
import banners from "./banners";
import messages from "./messages";

const admin: Dictionary["admin"] = {
  nav,
  dashboard,
  orders,
  customers,
  reviews,
  settings,
  books,
  genres,
  promotions,
  promoCodes,
  banners,
  messages,
};

export default admin;
