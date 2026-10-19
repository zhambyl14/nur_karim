import common from "./common";
import nav from "./nav";
import status from "./status";
import errors from "./errors";
import home from "./home";
import catalog from "./catalog";
import book from "./book";
import authors from "./authors";
import info from "./info";
import reviews from "./reviews";
import cart from "./cart";
import checkout from "./checkout";
import orders from "./orders";
import gift from "./gift";
import auth from "./auth";
import account from "./account";
import library from "./library";
import reader from "./reader";
import messages from "./messages";
import admin from "./admin";

/**
 * Kazakh is the source dictionary: its shape defines the `Dictionary` type and
 * every Russian namespace must match it exactly (TypeScript enforces this).
 */
const kk = {
  common,
  nav,
  status,
  errors,
  home,
  catalog,
  book,
  authors,
  info,
  reviews,
  cart,
  checkout,
  orders,
  gift,
  auth,
  account,
  library,
  reader,
  messages,
  admin,
};

export type Dictionary = typeof kk;
export default kk;
