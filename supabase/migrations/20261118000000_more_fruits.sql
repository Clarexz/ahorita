-- =============================================================================
-- 20261118000000_more_fruits.sql
-- Ajustes v0.13.3: 40 frutas agrupadas por color (D128). Reemplaza las reglas de
-- 20261108000000_fruits.sql; el bloque de llaves, grupos y sugeridas se genera de
-- src/lib/fruits.ts y la prueba src/lib/__tests__/fruitsSql.test.ts revisa que
-- coincidan.
--   * private.fruit_group(f): grupo de color de una fruta (NULL = llave inválida).
--   * private.fruit_clash: 'same' | 'similar' (mismo grupo de color o un par del
--     manual que se parece) | NULL.
--   * private.suggested_fruit: sugerida para la pareja (siempre de otro grupo).
--   * public.set_fruit valida con fruit_group (mismos errores que antes).
--   * profiles.fruit y stories.bg aceptan las llaves nuevas (el fondo de texto de
--     una story es la fruta de quien la hace).
-- Afloja reglas (Sandía–Pitaya, Uva–Pitaya, etc. siguen bloqueadas; ninguna
-- pareja existente queda inválida).
-- =============================================================================

alter table public.profiles drop constraint if exists profiles_fruit_valid;
alter table public.profiles
  add constraint profiles_fruit_valid
  check (fruit is null or fruit in (
    'sandia', 'fresa', 'manzana_roja', 'frambuesa', 'cereza', 'granada', 'pitaya', 'tuna',
    'toronja', 'lichi', 'guayaba_rosa', 'mandarina', 'naranja', 'durazno', 'papaya', 'mamey',
    'chabacano', 'melon', 'mango', 'platano', 'pina', 'maracuya', 'carambola', 'guayaba',
    'limon', 'manzana_verde', 'kiwi', 'pera', 'uva_verde', 'aguacate', 'uva', 'arandano',
    'ciruela', 'higo', 'zarzamora', 'capulin', 'coco', 'tamarindo', 'datil', 'chicozapote'
  ));

alter table public.stories drop constraint if exists stories_bg;
alter table public.stories add constraint stories_bg check (
  bg is null or bg in (
    'paper', 'postit', 'jamaica', 'cempasuchil', 'nopal', 'ink', 'bone',
    'sandia', 'fresa', 'manzana_roja', 'frambuesa', 'cereza', 'granada', 'pitaya', 'tuna',
    'toronja', 'lichi', 'guayaba_rosa', 'mandarina', 'naranja', 'durazno', 'papaya', 'mamey',
    'chabacano', 'melon', 'mango', 'platano', 'pina', 'maracuya', 'carambola', 'guayaba',
    'limon', 'manzana_verde', 'kiwi', 'pera', 'uva_verde', 'aguacate', 'uva', 'arandano',
    'ciruela', 'higo', 'zarzamora', 'capulin', 'coco', 'tamarindo', 'datil', 'chicozapote'
  )
);

-- -----------------------------------------------------------------------------
-- Reglas puras (FRUITS de src/lib/fruits.ts)
-- -----------------------------------------------------------------------------

create or replace function private.fruit_group(f text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case f
    when 'sandia' then 'rojo'
    when 'fresa' then 'rojo'
    when 'manzana_roja' then 'rojo'
    when 'frambuesa' then 'rojo'
    when 'cereza' then 'rojo'
    when 'granada' then 'rojo'
    when 'pitaya' then 'rosa'
    when 'tuna' then 'rosa'
    when 'toronja' then 'rosa'
    when 'lichi' then 'rosa'
    when 'guayaba_rosa' then 'rosa'
    when 'mandarina' then 'naranja'
    when 'naranja' then 'naranja'
    when 'durazno' then 'naranja'
    when 'papaya' then 'naranja'
    when 'mamey' then 'naranja'
    when 'chabacano' then 'naranja'
    when 'melon' then 'naranja'
    when 'mango' then 'amarillo'
    when 'platano' then 'amarillo'
    when 'pina' then 'amarillo'
    when 'maracuya' then 'amarillo'
    when 'carambola' then 'amarillo'
    when 'guayaba' then 'amarillo'
    when 'limon' then 'verde'
    when 'manzana_verde' then 'verde'
    when 'kiwi' then 'verde'
    when 'pera' then 'verde'
    when 'uva_verde' then 'verde'
    when 'aguacate' then 'verde'
    when 'uva' then 'morado'
    when 'arandano' then 'morado'
    when 'ciruela' then 'morado'
    when 'higo' then 'morado'
    when 'zarzamora' then 'morado'
    when 'capulin' then 'morado'
    when 'coco' then 'cafe'
    when 'tamarindo' then 'cafe'
    when 'datil' then 'cafe'
    when 'chicozapote' then 'cafe'
  end;
$$;
comment on function private.fruit_group(text) is 'Grupo de color de una fruta (FRUITS[f].group); NULL si la llave no existe.';

-- 'same' | 'similar' | null (fruitClash; el orden no importa).
create or replace function private.fruit_clash(a text, b text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when a = b then 'same'
    when private.fruit_group(a) = private.fruit_group(b) then 'similar'
    when (least(a, b), greatest(a, b)) in (
      ('pitaya', 'sandia'),
      ('mandarina', 'sandia'),
      ('limon', 'mango'),
      ('mandarina', 'mango'),
      ('pitaya', 'uva')
    ) then 'similar'
    else null
  end;
$$;
comment on function private.fruit_clash(text, text) is 'Si dos frutas no pueden convivir: same | similar (mismo grupo de color o par del manual) | null (fruitClash).';

create or replace function private.suggested_fruit(f text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case f
    when 'sandia' then 'mango'
    when 'fresa' then 'mango'
    when 'manzana_roja' then 'mango'
    when 'frambuesa' then 'mango'
    when 'cereza' then 'mango'
    when 'granada' then 'mango'
    when 'pitaya' then 'limon'
    when 'tuna' then 'limon'
    when 'toronja' then 'limon'
    when 'lichi' then 'limon'
    when 'guayaba_rosa' then 'limon'
    when 'mandarina' then 'uva'
    when 'naranja' then 'uva'
    when 'durazno' then 'uva'
    when 'papaya' then 'uva'
    when 'mamey' then 'uva'
    when 'chabacano' then 'uva'
    when 'melon' then 'uva'
    when 'mango' then 'sandia'
    when 'platano' then 'sandia'
    when 'pina' then 'sandia'
    when 'maracuya' then 'sandia'
    when 'carambola' then 'sandia'
    when 'guayaba' then 'sandia'
    when 'limon' then 'pitaya'
    when 'manzana_verde' then 'pitaya'
    when 'kiwi' then 'pitaya'
    when 'pera' then 'pitaya'
    when 'uva_verde' then 'pitaya'
    when 'aguacate' then 'pitaya'
    when 'uva' then 'limon'
    when 'arandano' then 'mandarina'
    when 'ciruela' then 'limon'
    when 'higo' then 'limon'
    when 'zarzamora' then 'limon'
    when 'capulin' then 'limon'
    when 'coco' then 'mango'
    when 'tamarindo' then 'mango'
    when 'datil' then 'mango'
    when 'chicozapote' then 'mango'
  end;
$$;
comment on function private.suggested_fruit(text) is 'Fruta sugerida para la pareja de f (FRUITS[f].suggested).';

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------

create or replace function public.set_fruit(p_fruit text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
  v_partner uuid;
  v_clash text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_fruit is null or private.fruit_group(p_fruit) is null then
    raise exception 'invalid_fruit' using errcode = 'P0001';
  end if;

  select cm.couple_id into v_couple_id from public.couple_members cm where cm.user_id = v_uid;
  if v_couple_id is not null then
    select cm.user_id into v_partner
    from public.couple_members cm
    where cm.couple_id = v_couple_id and cm.user_id <> v_uid
    limit 1;
  end if;

  -- Solo bloquea la fruta que tu pareja ELIGIÓ: si no ha elegido, toma la sugerida de la tuya.
  if v_partner is not null then
    v_clash := private.fruit_clash(
      p_fruit,
      (select p.fruit from public.profiles p where p.id = v_partner)
    );
    if v_clash = 'same' then
      raise exception 'fruit_taken' using errcode = 'P0001';
    elsif v_clash = 'similar' then
      raise exception 'fruit_too_similar' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles p set fruit = p_fruit where p.id = v_uid;
  if not found then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if v_couple_id is not null then
    perform private.send_widget_push(v_couple_id, v_uid, 'profile');
  end if;
  return p_fruit;
end;
$$;
comment on function public.set_fruit(text) is 'Elige la fruta de auth.uid(); rechaza la que eligió su pareja y las del mismo color o que se le parecen.';

revoke all on function private.fruit_group(text) from public, anon, authenticated;
revoke all on function private.fruit_clash(text, text) from public, anon, authenticated;
revoke all on function private.suggested_fruit(text) from public, anon, authenticated;
revoke all on function public.set_fruit(text) from public, anon;
grant execute on function public.set_fruit(text) to authenticated, service_role;
