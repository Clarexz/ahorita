-- =============================================================================
-- 20261118000001_precise_location.sql
-- Ajustes v0.13.3: distancia precisa para saber cuándo están juntos (D129).
-- Reemplaza el redondeo a 2 decimales (~1 km, D81): con ubicación aproximada de
-- Android y ese redondeo, estando lado a lado la app decía "a 3 km".
--   * locations guarda 4 decimales (~11 m) y la precisión de la lectura en metros
--     (`accuracy_m`, NULL si el celular no la dio). Sigue siendo SOLO la última
--     ubicación de cada quien, sin historial.
--   * set_my_location(p_lat, p_lng, p_city, p_accuracy): redondea a 4 decimales y
--     solo avisa al widget de la pareja si te moviste más de 50 m, cambió la
--     ciudad o cambiaste de pareja (no en cada lectura).
-- Errores (P0001): not_authenticated, no_couple, invalid_location.
-- =============================================================================

alter table public.locations add column if not exists accuracy_m integer;
alter table public.locations drop constraint if exists locations_accuracy_range;
alter table public.locations
  add constraint locations_accuracy_range check (accuracy_m is null or accuracy_m between 0 and 100000);
comment on column public.locations.accuracy_m is 'Precisión de la lectura en metros (radio); NULL si el celular no la dio.';
comment on table public.locations is 'Última ubicación (4 decimales, ~11 m) de quien comparte su distancia, sin historial. Se escribe con set_my_location()/clear_my_location().';

-- Firma nueva (con precisión): se borra la de 3 parámetros para que no haya dos.
-- Las versiones viejas de la app la llaman sin p_accuracy y caen en el default.
drop function if exists public.set_my_location(double precision, double precision, text);

create or replace function public.set_my_location(
  p_lat double precision,
  p_lng double precision,
  p_city text default null,
  p_accuracy double precision default null
)
returns public.locations
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid := private.require_couple();
  v_lat double precision;
  v_lng double precision;
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_accuracy integer;
  v_old public.locations;
  v_row public.locations;
  v_moved_m double precision;
begin
  if p_lat is null or p_lng is null or p_lat = 'NaN'::double precision or p_lng = 'NaN'::double precision
    or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180
    or (v_city is not null and char_length(v_city) > 80)
    or p_accuracy = 'NaN'::double precision or p_accuracy < 0
  then
    raise exception 'invalid_location' using errcode = 'P0001';
  end if;
  v_lat := round(p_lat::numeric, 4)::double precision;
  v_lng := round(p_lng::numeric, 4)::double precision;
  -- Ojo: least() ignora los NULL, por eso el case.
  v_accuracy := case when p_accuracy is null then null else least(round(p_accuracy), 100000)::integer end;

  select * into v_old from public.locations l where l.user_id = v_uid;

  insert into public.locations as l (user_id, couple_id, lat, lng, city, accuracy_m, updated_at)
  values (v_uid, v_couple_id, v_lat, v_lng, v_city, v_accuracy, now())
  on conflict (user_id) do update
    set couple_id = excluded.couple_id,
        lat = excluded.lat,
        lng = excluded.lng,
        city = excluded.city,
        accuracy_m = excluded.accuracy_m,
        updated_at = excluded.updated_at
  returning * into v_row;

  if v_old.user_id is not null then
    -- Aproximación plana: sobra para decidir si te moviste unas decenas de metros.
    v_moved_m := 111320 * sqrt(
      power(v_lat - v_old.lat, 2)
      + power((v_lng - v_old.lng) * cos(radians((v_lat + v_old.lat) / 2)), 2)
    );
  end if;

  if v_old.user_id is null
    or v_old.couple_id <> v_couple_id
    or v_moved_m > 50
    or v_old.city is distinct from v_city
  then
    perform private.send_widget_push(v_couple_id, v_uid, 'distance');
  end if;
  return v_row;
end;
$$;
comment on function public.set_my_location(double precision, double precision, text, double precision) is 'Guarda la última ubicación de auth.uid() (4 decimales y precisión en metros; opt-in de distancia).';

revoke all on function public.set_my_location(double precision, double precision, text, double precision) from public, anon;
grant execute on function public.set_my_location(double precision, double precision, text, double precision) to authenticated, service_role;
