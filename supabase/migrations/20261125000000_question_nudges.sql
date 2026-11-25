-- =============================================================================
-- v0.16 — Toques por pregunta y sin límite (D155).
--   * nudges.question_id: a qué pregunta pendiente va el toque (null en los viejos).
--   * nudge_question(p_question_id): manda un toque para esa pregunta, sin tope diario ni espera,
--     y devuelve cuántos llevo en esa pregunta ("Ya le mandaste X toques").
--   * question_nudge_count(p_question_id): cuántos llevo en esa pregunta.
--   * send_nudge(text) y nudge_status() se quedan para los APK viejos, ya sin límites.
--   * notification_event: el push del toque lleva la pregunta (para abrir esa y no la de hoy),
--     si es la de hoy y cuántos van.
-- Errores (P0001): question_not_found, no_partner, nudge_already_answered (ya contestó).
-- =============================================================================

alter table public.nudges
  add column if not exists question_id uuid references public.questions (id) on delete cascade;
comment on column public.nudges.question_id is 'Pregunta a la que va el toque (null en los de antes de la v0.16).';

create index if not exists nudges_question_from_idx
  on public.nudges (couple_id, question_id, from_user);

-- Ya no se usa: el tope diario se fue.
drop function if exists private.my_nudges_today(uuid, uuid);

-- APK viejos (≤ v0.15): mismo contrato, sin tope ni espera y sin pregunta.
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
begin
  if coalesce(p_kind, '') <> 'answer' then
    raise exception 'invalid_nudge' using errcode = 'P0001';
  end if;
  select cm.user_id into v_partner from public.couple_members cm
  where cm.couple_id = v_couple_id and cm.user_id <> v_uid;
  if v_partner is null then
    raise exception 'no_partner' using errcode = 'P0001';
  end if;
  insert into public.nudges (couple_id, from_user, to_user, kind)
  values (v_couple_id, v_uid, v_partner, p_kind)
  returning * into v_nudge;
  return v_nudge;
end;
$$;
comment on function public.send_nudge(text) is 'Toque sin pregunta (APK ≤ v0.15). Sin tope desde la v0.16.';

-- APK viejos pintan "te quedan N" con esto: siempre les quedan todos.
create or replace function public.nudge_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_couple();
  return jsonb_build_object('sent_today', 0, 'daily_limit', 10, 'last_at', null);
end;
$$;
comment on function public.nudge_status() is 'Compatibilidad con APK ≤ v0.15: desde la v0.16 no hay tope.';

-- Cuántos toques le he mandado a mi pareja para esta pregunta.
create or replace function public.question_nudge_count(p_question_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
begin
  return (
    select count(*)::integer from public.nudges n
    where n.couple_id = v_couple_id and n.from_user = v_uid and n.question_id = p_question_id
  );
end;
$$;
comment on function public.question_nudge_count(uuid) is 'Toques que mandé para esta pregunta (todos, sin importar el día).';
revoke all on function public.question_nudge_count(uuid) from public, anon;
grant execute on function public.question_nudge_count(uuid) to authenticated, service_role;

-- Toque para una pregunta que mi pareja no ha contestado. Sin tope ni espera (pedido del usuario).
create or replace function public.nudge_question(p_question_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := public.require_couple();
  v_partner uuid;
  v_question public.questions;
begin
  select cm.user_id into v_partner from public.couple_members cm
  where cm.couple_id = v_couple_id and cm.user_id <> v_uid;
  if v_partner is null then
    raise exception 'no_partner' using errcode = 'P0001';
  end if;
  select * into v_question from public.questions q where q.id = p_question_id;
  if not found or not public.question_visible(v_question) then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.answers a
    where a.couple_id = v_couple_id and a.question_id = p_question_id and a.user_id = v_partner
  ) then
    raise exception 'nudge_already_answered' using errcode = 'P0001';
  end if;
  insert into public.nudges (couple_id, from_user, to_user, kind, question_id)
  values (v_couple_id, v_uid, v_partner, 'answer', p_question_id);
  return public.question_nudge_count(p_question_id);
end;
$$;
comment on function public.nudge_question(uuid) is 'Toque a mi pareja para que conteste esta pregunta; devuelve cuántos llevo en ella.';
revoke all on function public.nudge_question(uuid) from public, anon;
grant execute on function public.nudge_question(uuid) to authenticated, service_role;

-- Misma función que en 20261107000000_love_languages_visits_stats.sql; solo cambia la rama 'nudge'.
create or replace function private.notification_event(
  p_kind text,
  p_couple_id uuid,
  p_actor uuid,
  p_row jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
  v_tokens jsonb;
  v_prefs public.notification_prefs;
  v_data jsonb := '{}'::jsonb;
  v_question_id uuid;
  v_day date;
  v_answered boolean;
begin
  if p_kind = 'test' then
    v_recipient := p_actor;
  else
    select cm.user_id into v_recipient
    from public.couple_members cm
    where cm.couple_id = p_couple_id and cm.user_id <> p_actor
    limit 1;
    -- El actor debe seguir en la pareja (filas viejas o de otra pareja no avisan).
    if v_recipient is null or not exists (
      select 1 from public.couple_members cm where cm.couple_id = p_couple_id and cm.user_id = p_actor
    ) then
      return null;
    end if;
  end if;

  select coalesce(jsonb_agg(pt.token order by pt.updated_at desc), '[]'::jsonb) into v_tokens
  from public.push_tokens pt where pt.user_id = v_recipient;
  if jsonb_array_length(v_tokens) = 0 then
    return null;
  end if;

  select * into v_prefs from public.notification_prefs np where np.user_id = v_recipient;

  if p_kind in ('answer', 'comment') then
    v_question_id := (p_row ->> 'question_id')::uuid;
    select max(dq.day) into v_day
    from public.daily_questions dq
    where dq.couple_id = p_couple_id and dq.question_id = v_question_id;
    v_answered := exists (
      select 1 from public.answers a
      where a.couple_id = p_couple_id and a.question_id = v_question_id and a.user_id = v_recipient
    );
    v_data := jsonb_build_object(
      'question_id', v_question_id,
      'day', v_day,
      'question_text', (select q.text from public.questions q where q.id = v_question_id),
      'recipient_answered', v_answered
    );
    if p_kind = 'comment' then
      v_data := v_data || jsonb_build_object(
        'comment_id', p_row ->> 'id',
        'body', case when v_answered then p_row ->> 'body' end
      );
    end if;
  elsif p_kind = 'mood' then
    v_data := jsonb_build_object('mood_id', p_row ->> 'id', 'emoji', p_row ->> 'emoji', 'note', p_row ->> 'note');
  elsif p_kind = 'nudge' then
    -- Desde la v0.16 el toque va a una pregunta: el push abre esa, dice si es la de hoy y cuántos van.
    v_question_id := (p_row ->> 'question_id')::uuid;
    if v_question_id is null then
      v_day := public.couple_today(p_couple_id);
    else
      select max(dq.day) into v_day
      from public.daily_questions dq
      where dq.couple_id = p_couple_id and dq.question_id = v_question_id;
    end if;
    v_data := jsonb_build_object(
      'nudge_id', p_row ->> 'id',
      'nudge_kind', p_row ->> 'kind',
      'question_id', v_question_id,
      'day', v_day,
      'today', v_day is not null and v_day = public.couple_today(p_couple_id),
      'question_text', (select q.text from public.questions q where q.id = v_question_id),
      'nudge_count', case when v_question_id is null then 1 else (
        select count(*) from public.nudges n
        where n.couple_id = p_couple_id and n.from_user = p_actor and n.question_id = v_question_id
      ) end
    );
  elsif p_kind = 'story' then
    v_data := jsonb_build_object(
      'story_id', p_row ->> 'id',
      'story_kind', p_row ->> 'kind',
      'text', case when p_row ->> 'kind' = 'text' then p_row ->> 'text' end
    );
  elsif p_kind = 'memory' then
    v_data := jsonb_build_object(
      'memory_id', p_row ->> 'id',
      'title', p_row ->> 'title',
      'happened_on', p_row ->> 'happened_on',
      'place_name', p_row ->> 'place_name'
    );
  elsif p_kind = 'game' then
    v_data := jsonb_build_object(
      'round_id', p_row ->> 'round_id',
      'game', p_row ->> 'game',
      'event', p_row ->> 'event',
      'match_pct', p_row -> 'match_pct'
    );
  elsif p_kind = 'drawing' then
    -- La palabra solo viaja cuando el reto ya terminó.
    v_data := jsonb_build_object(
      'drawing_id', p_row ->> 'drawing_id',
      'event', p_row ->> 'event',
      'word', case when p_row ->> 'event' in ('solved', 'gave_up') then p_row ->> 'word' end
    );
  elsif p_kind = 'story_reply' then
    v_data := jsonb_build_object(
      'story_id', p_row ->> 'story_id',
      'reply_id', p_row ->> 'id',
      'body', p_row ->> 'body',
      'story_author_id', (select s.user_id from public.stories s where s.id = (p_row ->> 'story_id')::uuid)
    );
  elsif p_kind = 'love_language' then
    -- Nunca viaja el resultado: solo que ya lo hizo y si quien recibe también.
    v_data := jsonb_build_object(
      'event', p_row ->> 'event',
      'recipient_done', coalesce((p_row ->> 'recipient_done')::boolean, false)
    );
  elsif p_kind = 'visit' then
    v_data := jsonb_build_object(
      'visit_id', p_row ->> 'id',
      'start_date', p_row ->> 'start_date',
      'end_date', p_row ->> 'end_date',
      'place', p_row ->> 'place'
    );
  elsif p_kind <> 'test' then
    return null;
  end if;

  return jsonb_build_object(
    'kind', p_kind,
    'couple_id', p_couple_id,
    'actor', jsonb_build_object('id', p_actor, 'name', private.person_name(p_actor)),
    'recipient', jsonb_build_object('id', v_recipient, 'name', private.person_name(v_recipient)),
    'tokens', v_tokens,
    'prefs', jsonb_build_object(
      'answers', coalesce(v_prefs.answers, true),
      'comments', coalesce(v_prefs.comments, true),
      'moods', coalesce(v_prefs.moods, true),
      'nudges', coalesce(v_prefs.nudges, true),
      'stories', coalesce(v_prefs.stories, true),
      'memories', coalesce(v_prefs.memories, true),
      'games', coalesce(v_prefs.games, true)
    ),
    'data', v_data
  );
end;
$$;

revoke all on function private.notification_event(text, uuid, uuid, jsonb) from public, anon, authenticated;
