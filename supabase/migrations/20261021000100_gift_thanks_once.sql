-- A gift can be thanked once: stops repeated notifications to the sender.
create or replace function public.send_gift_thanks(p_code text, p_phone text, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  g public.gifts;
  v_msg text := nullif(trim(coalesce(p_message, '')), '');
begin
  select * into g from public.gifts where code = p_code for update;
  if not found or g.status not in ('active', 'opened', 'claimed') then
    return jsonb_build_object('ok', false, 'error', 'NOT_AVAILABLE');
  end if;
  if g.reveal_at is not null and g.reveal_at > now() then
    return jsonb_build_object('ok', false, 'error', 'NOT_REVEALED');
  end if;
  if not ((v_uid is not null and g.recipient_user_id = v_uid)
          or public.normalize_phone(p_phone) = g.recipient_phone) then
    return jsonb_build_object('ok', false, 'error', 'PHONE_MISMATCH');
  end if;
  if g.thanked_at is not null then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_THANKED');
  end if;
  if v_msg is null or length(v_msg) > 500 then
    return jsonb_build_object('ok', false, 'error', 'MESSAGE_INVALID');
  end if;
  update public.gifts set thank_you_message = v_msg, thanked_at = now() where id = g.id;
  return jsonb_build_object('ok', true);
end
$$;
