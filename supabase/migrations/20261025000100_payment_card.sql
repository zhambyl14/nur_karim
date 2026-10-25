-- Payment by card transfer: the admin writes the store card number in settings
-- (replaces the transfer phone number).
alter table public.store_settings rename column payment_phone to payment_card;
alter table public.store_settings alter column payment_card set default '';
update public.store_settings set payment_card = '' where id = 1;
