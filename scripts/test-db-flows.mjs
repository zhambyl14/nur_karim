// End-to-end checks of the money logic in the database (RPCs + triggers + RLS)
// using the real Supabase project and the dev test accounts.
//   node scripts/test-db-flows.mjs
// Creates orders, moves them through statuses and cleans everything up.
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env.mjs";

const { url, anon, service } = loadEnv();
const CLIENT = { phone: "87000000001", password: "NurKarim-test-1" };
const ADMIN = { phone: "87000000002", password: "NurKarim-admin-1" };

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const svc = createClient(url, service, opts);
const guest = createClient(url, anon, opts);

async function signIn({ phone, password }) {
  const c = createClient(url, anon, opts);
  const { error } = await c.auth.signInWithPassword({ email: `${phone}@karim.kz`, password });
  if (error) throw new Error(`sign in ${phone}: ${error.message}`);
  return c;
}

let passed = 0;
let failed = 0;
function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name}${extra !== undefined ? ` → ${JSON.stringify(extra).slice(0, 400)}` : ""}`);
  }
}

const created = [];
const client = await signIn(CLIENT);
const admin = await signIn(ADMIN);
const { data: clientProfile } = await client.from("profiles").select("*").eq("phone", CLIENT.phone).single();

async function book(slug) {
  const { data } = await svc.from("books").select("*").eq("slug", slug).single();
  return data;
}

try {
  const b1 = await book("paigambarlar-kissasy-balalarga"); // paper 3400
  const b2 = await book("kishkentai-musylmannyn-adebi"); // paper 2800
  const b3 = await book("kazak-khandygy-tarikhy"); // paper 7400, 10% promotion (tarikh), low stock
  console.log("\n1. quote_cart");
  {
    const { data: q } = await guest.rpc("quote_cart", {
      p_items: [
        { book_id: b1.id, format: "paper", quantity: 2 },
        { book_id: b2.id, format: "paper", quantity: 1 },
      ],
    });
    check("guest can quote", q?.ok === true, q);
    check("subtotal = 2×3400 + 2800", q?.subtotal === 9600, q?.subtotal);
    check("delivery required for paper", q?.delivery_required === true);
    const { data: q2 } = await guest.rpc("quote_cart", {
      p_items: [{ book_id: b1.id, format: "paper", quantity: 1 }],
      p_delivery_method: "kazpost",
    });
    check("kazpost price 1500", q2?.delivery_price === 1500 && q2?.total === 3400 + 1500, q2);
    const { data: q3 } = await guest.rpc("quote_cart", {
      p_items: [{ book_id: b3.id, format: "paper", quantity: 1 }],
      p_delivery_method: "astana_courier",
    });
    check("history promotion −10% applied", q3?.lines?.[0]?.unit_final_price === 6660, q3?.lines?.[0]);
    check("astana courier 1000", q3?.delivery_price === 1000 && q3?.total === 7660, q3);
    const { data: q4 } = await guest.rpc("quote_cart", {
      p_items: [{ book_id: b1.id, format: "paper", quantity: 99 }],
    });
    check("out of stock detected", q4?.ok === false && q4?.errors?.[0]?.code === "OUT_OF_STOCK", q4?.errors);
    const { data: q5 } = await client.rpc("quote_cart", {
      p_items: [{ book_id: b2.id, format: "paper", quantity: 1 }], // 2800 < min 3000
      p_promo_code: "NURKARIM10",
    });
    check("promo below min amount rejected", q5?.promo?.valid === false && q5?.promo?.error === "PROMO_MIN_AMOUNT", q5?.promo);
    const { data: q6 } = await client.rpc("quote_cart", {
      p_items: [{ book_id: b1.id, format: "paper", quantity: 2 }],
      p_promo_code: "nurkarim10",
    });
    check("promo (case-insensitive) −10%", q6?.promo?.valid === true && q6?.promo_discount === 680, q6?.promo);
    const { data: q7 } = await client.rpc("quote_cart", {
      p_items: [{ book_id: b1.id, format: "paper", quantity: 1 }],
      p_promo_code: "NOPE-CODE",
    });
    check("unknown promo", q7?.promo?.error === "PROMO_INVALID", q7?.promo);
  }

  console.log("\n2. create_order (Astana courier) + stock reservation");
  const stockBefore = (await book(b1.slug)).stock;
  let order1;
  {
    const { data: q } = await client.rpc("quote_cart", {
      p_items: [{ book_id: b1.id, format: "paper", quantity: 2 }],
      p_delivery_method: "astana_courier",
    });
    const { data: r } = await guest.rpc("create_order", { p_payload: {} });
    check("guest cannot create orders", r === null || r?.ok === false);
    const { data: bad } = await client.rpc("create_order", {
      p_payload: {
        items: [{ book_id: b1.id, format: "paper", quantity: 2 }],
        delivery_method: "astana_courier",
        contact: { name: "Тест", phone: CLIENT.phone },
        address: { street: "" },
        expected_total: q.total,
      },
    });
    check("missing address rejected", bad?.ok === false && bad?.errors?.[0]?.code === "ADDRESS_INVALID", bad);
    const { data: wrongTotal } = await client.rpc("create_order", {
      p_payload: {
        items: [{ book_id: b1.id, format: "paper", quantity: 2 }],
        delivery_method: "astana_courier",
        contact: { name: "Тест", phone: CLIENT.phone },
        address: { street: "Тұран даңғылы", house: "1" },
        expected_total: q.total - 1,
      },
    });
    check("PRICE_CHANGED when expected_total differs", wrongTotal?.errors?.[0]?.code === "PRICE_CHANGED", wrongTotal);
    const { data: ok, error } = await client.rpc("create_order", {
      p_payload: {
        items: [{ book_id: b1.id, format: "paper", quantity: 2 }],
        delivery_method: "astana_courier",
        contact: { name: "Айдана Қасым", phone: "+7 700 000 00 01" },
        address: { street: "Тұран даңғылы", house: "37", apartment: "12", comment: "TEST ORDER" },
        expected_total: q.total,
      },
    });
    check("order created", ok?.ok === true, ok ?? error);
    order1 = ok;
    created.push(ok?.order_id);
    const { data: o } = await client.from("orders").select("*").eq("id", ok.order_id).single();
    check("order totals stored", o.total === 6800 + 1000 && o.delivery_price === 1000 && o.delivery_city === "Астана", o);
    check("phone normalized", o.contact_phone === "87000000001", o.contact_phone);
    const stockAfter = (await book(b1.slug)).stock;
    check("stock reserved (−2)", stockAfter === stockBefore - 2, { stockBefore, stockAfter });
    const { data: hist } = await client.from("order_status_history").select("status").eq("order_id", ok.order_id);
    check("history row on insert", hist?.length === 1 && hist[0].status === "pending_payment", hist);
  }

  console.log("\n3. payment flow");
  {
    const { data: r1 } = await client.rpc("mark_order_paid", { p_order_id: order1.order_id, p_receipt_path: "someone-else/receipt.png" });
    check("foreign receipt path rejected", r1?.ok === false && r1?.error === "INVALID_RECEIPT", r1);
    const { data: r2 } = await client.rpc("mark_order_paid", { p_order_id: order1.order_id });
    check("client marks paid", r2?.ok === true, r2);
    const { error: e3 } = await client.rpc("admin_update_order", { p_order_id: order1.order_id, p_status: "paid" });
    check("client cannot use admin_update_order", !!e3, e3?.message);
    const soldBefore = (await book(b1.slug)).sold_count;
    const { data: r4 } = await admin.rpc("admin_update_order", { p_order_id: order1.order_id, p_status: "paid", p_note: "test" });
    check("admin confirms payment", r4?.ok === true && r4?.status === "paid", r4);
    const soldAfter = (await book(b1.slug)).sold_count;
    check("sold_count +2", soldAfter === soldBefore + 2, { soldBefore, soldAfter });
    const { data: r5 } = await admin.rpc("admin_update_order", { p_order_id: order1.order_id, p_status: "pending_payment" });
    check("invalid transition rejected", r5?.ok === false && r5?.error === "INVALID_TRANSITION", r5);
    const { data: r6 } = await admin.rpc("admin_update_order", { p_order_id: order1.order_id, p_status: "shipped", p_tracking_number: "CC123456789KZ" });
    check("shipped with tracking", r6?.ok === true, r6);
    const { data: r7 } = await admin.rpc("admin_update_order", { p_order_id: order1.order_id, p_status: "delivered" });
    check("delivered", r7?.ok === true, r7);
    const { data: o } = await client.from("orders").select("status, tracking_number, shipped_at, delivered_at, payment_confirmed_at").eq("id", order1.order_id).single();
    check("timestamps set", !!o.shipped_at && !!o.delivered_at && !!o.payment_confirmed_at && o.tracking_number === "CC123456789KZ", o);
    const { data: canReview } = await client.rpc("has_purchased", { p_book_id: b1.id });
    check("has_purchased after delivery", canReview === true, canReview);
  }

  console.log("\n4. cancel restores stock + promo use");
  {
    const before = (await book(b2.slug)).stock;
    const { data: q } = await client.rpc("quote_cart", {
      p_items: [{ book_id: b2.id, format: "paper", quantity: 2 }],
      p_delivery_method: "kazpost",
      p_promo_code: "NURKARIM10",
    });
    const { data: ok } = await client.rpc("create_order", {
      p_payload: {
        items: [{ book_id: b2.id, format: "paper", quantity: 2 }],
        delivery_method: "kazpost",
        promo_code: "NURKARIM10",
        contact: { name: "Айдана Қасым", phone: CLIENT.phone },
        address: { region: "Қарағанды облысы", city: "Қарағанды", postal_code: "100000", street: "Бұқар жырау", house: "10", recipient_name: "Қасым Айдана Ерланқызы" },
        expected_total: q.total,
      },
    });
    check("kazpost order with promo", ok?.ok === true && q.promo_discount === 560, { ok, promo: q.promo });
    created.push(ok?.order_id);
    const { data: pc } = await svc.from("promo_codes").select("used_count").eq("code", "NURKARIM10").single();
    const { data: again } = await client.rpc("quote_cart", {
      p_items: [{ book_id: b2.id, format: "paper", quantity: 2 }],
      p_promo_code: "NURKARIM10",
    });
    check("per-user limit enforced", again?.promo?.error === "PROMO_ALREADY_USED", again?.promo);
    const { data: c1 } = await client.rpc("cancel_my_order", { p_order_id: ok.order_id });
    check("client cancels unpaid order", c1?.ok === true, c1);
    const after = (await book(b2.slug)).stock;
    check("stock restored", after === before, { before, after });
    const { data: pc2 } = await svc.from("promo_codes").select("used_count").eq("code", "NURKARIM10").single();
    check("promo use released", pc2.used_count === pc.used_count - 1, { before: pc.used_count, after: pc2.used_count });
  }

  console.log("\n5. gift: friend fills the address");
  {
    const { data: q } = await client.rpc("quote_cart", {
      p_items: [{ book_id: b2.id, format: "paper", quantity: 1 }],
      p_delivery_method: "kazpost",
      p_is_gift: true,
      p_gift_wrap: true,
    });
    check("gift wrap priced", q?.gift_wrap_price === 500, q);
    const { data: ok } = await client.rpc("create_order", {
      p_payload: {
        items: [{ book_id: b2.id, format: "paper", quantity: 1 }],
        delivery_method: "kazpost",
        contact: { name: "Айдана Қасым", phone: CLIENT.phone },
        address: { region: "Павлодар облысы", city: "Павлодар" },
        expected_total: q.total,
        gift: {
          recipient_name: "Дос",
          recipient_phone: "+7 701 111 22 33",
          message: "Туған күніңмен!",
          card_theme: "birthday",
          address_mode: "recipient",
          gift_wrap: true,
          is_anonymous: true,
        },
      },
    });
    check("gift order created", ok?.ok === true, ok);
    created.push(ok?.order_id);
    const { data: g } = await svc.from("gifts").select("*").eq("order_id", ok.order_id).single();
    check("gift pending until payment", g?.status === "pending" && g.recipient_phone === "87011112233", g);
    const { data: hidden } = await guest.rpc("get_gift", { p_code: g.code });
    check("pending gift hidden from public", hidden === null, hidden);
    await admin.rpc("admin_update_order", { p_order_id: ok.order_id, p_status: "paid" });
    const { data: pub } = await guest.rpc("get_gift", { p_code: g.code });
    check("active gift visible", pub?.status === "active" && pub?.needs_address === true && pub?.sender_name === null, pub);
    check("recipient phone masked", pub?.recipient_phone_masked === "+7 701 *** ** 33", pub?.recipient_phone_masked);
    const { data: wrong } = await guest.rpc("submit_gift_address", { p_code: g.code, p_phone: "87000000000", p_address: {} });
    check("wrong phone rejected", wrong?.error === "PHONE_MISMATCH", wrong);
    const { data: addr } = await guest.rpc("submit_gift_address", {
      p_code: g.code,
      p_phone: "8 701 111 22 33",
      p_address: { region: "Павлодар облысы", city: "Павлодар", postal_code: "140000", street: "Сәтпаев", house: "5" },
    });
    check("friend submits address", addr?.ok === true, addr);
    const { data: thanks } = await guest.rpc("send_gift_thanks", { p_code: g.code, p_phone: "87011112233", p_message: "Рахмет!" });
    check("thank-you note", thanks?.ok === true, thanks);
    const { data: o } = await svc.from("orders").select("delivery_postal_code, delivery_street, recipient_name").eq("id", ok.order_id).single();
    check("address saved on order", o.delivery_postal_code === "140000" && o.recipient_name === "Дос", o);
  }

  console.log("\n6. RLS isolation");
  {
    const { data: others } = await guest.from("orders").select("id");
    check("guest sees no orders", (others ?? []).length === 0, others);
    const { data: tok } = await client.from("telegram_tokens").select("id");
    check("client cannot read telegram tokens", (tok ?? []).length === 0, tok);
    const { error: upd } = await client.from("profiles").update({ role: "admin" }).eq("id", clientProfile.id);
    const { data: prof } = await svc.from("profiles").select("role").eq("id", clientProfile.id).single();
    check("client cannot promote self", prof.role === "client", { upd, prof });
    const { data: dash, error: de } = await client.rpc("admin_dashboard", { p_from: "2026-01-01", p_to: "2026-12-31" });
    check("client cannot read dashboard", !!de && !dash, de?.message);
    const { data: d2, error: de2 } = await admin.rpc("admin_dashboard", { p_from: "2026-10-01T00:00:00+05:00", p_to: "2026-11-01T00:00:00+05:00" });
    check("admin dashboard works", !de2 && typeof d2?.kpis?.revenue === "number", de2?.message ?? Object.keys(d2 ?? {}));
    const { error: ins } = await client.from("store_settings").update({ delivery_astana_price: 1 }).eq("id", 1);
    const { data: st } = await svc.from("store_settings").select("delivery_astana_price").eq("id", 1).single();
    check("client cannot change settings", st.delivery_astana_price === 1000, { ins, st });
  }
} catch (error) {
  failed++;
  console.error("✘ crashed:", error);
} finally {
  console.log("\ncleanup…");
  for (const id of created.filter(Boolean)) {
    const { data: o } = await svc.from("orders").select("status").eq("id", id).maybeSingle();
    if (o && o.status !== "cancelled") {
      await admin.rpc("admin_update_order", { p_order_id: id, p_status: "cancelled", p_cancel_reason: "TEST" });
    }
    await svc.from("orders").delete().eq("id", id);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
