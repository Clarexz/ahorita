-- =============================================================================
-- Toques "Recuérdale a tu pareja": ráfaga en vez de uno cada 10 minutos.
--   * Hasta 10 toques por día de la pareja (private.couple_day_at, D118), espaciados como quieran.
--   * Mínimo 5 segundos entre uno y otro.
--   * Errores: nudge_too_soon (< 5 s desde mi último toque) y nudge_daily_limit (ya fueron 10).
--   * nudge_status(): cuántos llevo hoy y cuándo fue el último, para pintar "te quedan N".
-- Misma firma y mismos permisos que send_nudge(text) de 20261101000000_questions.sql.
-- =============================================================================

-- Toques que mandé hoy (día de la pareja) y el instante del último.
create or replace function private.my_nudges_today(p_couple_id uuid, p_user uuid)
returns table (sent_today integer, last_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (count(*) filter (
      where private.couple_day_at(p_couple_id, n.created_at)
          = private.couple_day_at(p_couple_id, now())
    ))::integer,
    max(n.created_at)
  from public.nudges n
  where n.couple_id = p_couple_id and n.from_user = p_user
    and n.created_at > now() - interval '3 days';
$$;
comment on function private.my_nudges_today(uuid, uuid) is 'Toques de p_user en el día actual de la pareja y su último instante.';
revoke all on function private.my_nudges_today(uuid, uuid) from public, anon, authenticated;

create or replace function public.send_nudge(p_kind text default 'answer')
returns public.nudges
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
  v_partner uuid;
  v_nudge public.nudges;
  v_sent integer;
  v_last timestamptz;
begin
  if coalesce(p_kind, '') <> 'answer' then
    raise exception 'invalid_nudge' using errcode = 'P0001';
  end if;
  select cm.user_id into v_partner from public.couple_members cm
  where cm.couple_id = v_couple_id and cm.user_id <> v_uid;
  if v_partner is null then
    raise exception 'no_partner' using errcode = 'P0001';
  end if;
  select t.sent_today, t.last_at into v_sent, v_last
  from private.my_nudges_today(v_couple_id, v_uid) t;
  if coalesce(v_sent, 0) >= 10 then
    raise exception 'nudge_daily_limit' using errcode = 'P0001';
  end if;
  if v_last is not null and v_last > now() - interval '5 seconds' then
    raise exception 'nudge_too_soon' using errcode = 'P0001';
  end if;
  insert into public.nudges (couple_id, from_user, to_user, kind)
  values (v_couple_id, v_uid, v_partner, p_kind)
  returning * into v_nudge;
  return v_nudge;
end;
$$;
comment on function public.send_nudge(text) is 'Registra un recordatorio para la pareja (máx. 10 por día de la pareja, 5 s entre uno y otro).';

create or replace function public.nudge_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
  v_sent integer;
  v_last timestamptz;
begin
  select t.sent_today, t.last_at into v_sent, v_last
  from private.my_nudges_today(v_couple_id, v_uid) t;
  return jsonb_build_object('sent_today', coalesce(v_sent, 0), 'daily_limit', 10, 'last_at', v_last);
end;
$$;
comment on function public.nudge_status() is 'Cuántos toques llevo hoy (día de la pareja), el tope y cuándo fue el último.';
revoke all on function public.nudge_status() from public, anon;
grant execute on function public.nudge_status() to authenticated, service_role;
