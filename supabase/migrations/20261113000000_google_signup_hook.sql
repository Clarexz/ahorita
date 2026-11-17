-- Registro abierto solo con Google (v0.13.2).
-- Hook "Before User Created" de GoTrue: se ejecuta antes de crear una cuenta nueva (no al
-- entrar con una cuenta que ya existe, ni al vincular la identidad de Google a una cuenta vieja).
-- Función pura: no toca tablas, por eso no es security definer. Deja pasar solo a quien se registra con Google; el registro con correo y contraseña se rechaza.
-- Doc: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
--
-- El servidor lo activa con (docs/SERVIDOR.md):
--   GOTRUE_HOOK_BEFORE_USER_CREATED_ENABLED=true
--   GOTRUE_HOOK_BEFORE_USER_CREATED_URI=pg-functions://postgres/private/hook_before_user_created
--
-- El mensaje del error es una clave estable que la app traduce (src/lib/errors.ts).

create or replace function private.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if event -> 'user' -> 'app_metadata' ->> 'provider' = 'google' then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'signup_requires_google'
    )
  );
end;
$$;

-- Solo GoTrue (supabase_auth_admin) la ejecuta; la app no entra a `private`.
grant usage on schema private to supabase_auth_admin;
revoke all on function private.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function private.hook_before_user_created(jsonb) to supabase_auth_admin;
