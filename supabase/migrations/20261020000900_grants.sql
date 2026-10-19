-- Nur Karim: tighten EXECUTE grants.
-- Functions get EXECUTE for PUBLIC by default, so revoke from PUBLIC and grant
-- explicitly. Public (anon) RPCs: quote_cart, get_gift, open_gift,
-- submit_gift_address, send_gift_thanks, catalog_stats, list_authors, is_admin
-- (used inside RLS policies evaluated for anon).

-- signed-in only
revoke execute on function public.create_order(jsonb) from public, anon;
revoke execute on function public.mark_order_paid(uuid, text) from public, anon;
revoke execute on function public.cancel_my_order(uuid) from public, anon;
revoke execute on function public.claim_gift(text) from public, anon;
revoke execute on function public.received_gifts() from public, anon;
revoke execute on function public.has_purchased(uuid) from public, anon;
revoke execute on function public.start_conversation(text, uuid, uuid) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.admin_update_order(uuid, public.order_status, text, text, text, text) from public, anon;
revoke execute on function public.admin_dashboard(timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_customers(text, int, int, text) from public, anon;
revoke execute on function public.admin_counters() from public, anon;
revoke execute on function public.admin_delete_demo_data() from public, anon;

grant execute on function public.create_order(jsonb) to authenticated;
grant execute on function public.mark_order_paid(uuid, text) to authenticated;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.claim_gift(text) to authenticated;
grant execute on function public.received_gifts() to authenticated;
grant execute on function public.has_purchased(uuid) to authenticated;
grant execute on function public.start_conversation(text, uuid, uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.admin_update_order(uuid, public.order_status, text, text, text, text) to authenticated;
grant execute on function public.admin_dashboard(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_customers(text, int, int, text) to authenticated;
grant execute on function public.admin_counters() to authenticated;
grant execute on function public.admin_delete_demo_data() to authenticated;

-- public
grant execute on function public.quote_cart(jsonb, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.get_gift(text) to anon, authenticated;
grant execute on function public.open_gift(text) to anon, authenticated;
grant execute on function public.submit_gift_address(text, text, jsonb) to anon, authenticated;
grant execute on function public.send_gift_thanks(text, text, text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- trigger / internal functions: never callable through the API
revoke execute on function public.reviews_before_write() from public, anon, authenticated;
revoke execute on function public.reviews_refresh_rating() from public, anon, authenticated;
revoke execute on function public.messages_after_insert() from public, anon, authenticated;
revoke execute on function public.orders_after_status() from public, anon, authenticated;
revoke execute on function public.orders_after_insert() from public, anon, authenticated;
revoke execute on function public.orders_before_update() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_columns() from public, anon, authenticated;
revoke execute on function public._quote_cart(uuid, jsonb, text, text, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.cancel_stale_orders() from public, anon, authenticated;
revoke execute on function public.cleanup_housekeeping() from public, anon, authenticated;
revoke execute on function public.attach_pending_gifts(uuid, text) from public, anon, authenticated;
