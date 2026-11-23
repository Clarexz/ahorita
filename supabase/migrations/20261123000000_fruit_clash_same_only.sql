-- Fruta: solo choca la MISMA (D100). Antes también chocaban las del mismo grupo de color y los
-- pares "parecidos" del manual; ahora cada quien puede elegir cualquiera salvo la que ya eligió
-- su pareja.
--   * private.fruit_clash: 'same' si son iguales, null en cualquier otro caso.
--   * public.set_fruit conserva su firma y su cuerpo: la rama 'similar' (fruit_too_similar)
--     ya no se alcanza porque fruit_clash nunca devuelve 'similar'.

create or replace function private.fruit_clash(a text, b text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when a = b then 'same' end;
$$;
comment on function private.fruit_clash(text, text) is 'Si dos frutas no pueden convivir: same (la misma fruta) | null (fruitClash).';

comment on function public.set_fruit(text) is 'Elige la fruta de auth.uid(); rechaza solo la que eligió su pareja (fruit_taken).';

revoke all on function private.fruit_clash(text, text) from public, anon, authenticated;
