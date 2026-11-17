-- Pruebas del hook "Before User Created" (migración 20261113000000_google_signup_hook.sql):
-- solo se permite crear cuentas nuevas con Google. Todo ocurre en una transacción con ROLLBACK.
--   psql -X -v ON_ERROR_STOP=1 -f supabase/tests/google_signup_hook.sql

begin;

-- Evento con la forma de la doc de Supabase (metadata + user.app_metadata.provider).
create function pg_temp.ev(p_provider text) returns jsonb language sql as $$
  select jsonb_build_object(
    'metadata', jsonb_build_object('name', 'before-user-created', 'ip_address', '127.0.0.1'),
    'user', jsonb_build_object(
      'email', 'nuevo@test.local',
      'app_metadata', jsonb_build_object('provider', p_provider, 'providers', jsonb_build_array(p_provider))
    )
  );
$$;

do $$
declare
  r jsonb;
begin
  -- Google: pasa (objeto vacío).
  r := private.hook_before_user_created(pg_temp.ev('google'));
  assert r = '{}'::jsonb, 'google debe devolver {}: ' || r::text;

  -- Correo: se rechaza con 403 y la clave estable que traduce la app.
  r := private.hook_before_user_created(pg_temp.ev('email'));
  assert (r -> 'error' ->> 'http_code')::int = 403, 'email debe dar http_code 403: ' || r::text;
  assert r -> 'error' ->> 'message' = 'signup_requires_google', 'mensaje inesperado: ' || r::text;

  -- Otros proveedores o eventos incompletos: también se rechazan (lista blanca, no lista negra).
  r := private.hook_before_user_created(pg_temp.ev('github'));
  assert r ? 'error', 'otro proveedor debe rechazarse';
  r := private.hook_before_user_created('{}'::jsonb);
  assert r ? 'error', 'evento sin usuario debe rechazarse';
  r := private.hook_before_user_created(pg_temp.ev('Google'));
  assert r ? 'error', 'el proveedor se compara exacto (minúsculas)';

  -- Permisos: GoTrue sí, la app no.
  assert has_function_privilege('supabase_auth_admin', 'private.hook_before_user_created(jsonb)', 'execute'),
    'supabase_auth_admin debe poder ejecutar el hook';
  assert has_schema_privilege('supabase_auth_admin', 'private', 'usage'),
    'supabase_auth_admin debe usar el schema private';
  assert not has_function_privilege('anon', 'private.hook_before_user_created(jsonb)', 'execute'),
    'anon no debe ejecutar el hook';
  assert not has_function_privilege('authenticated', 'private.hook_before_user_created(jsonb)', 'execute'),
    'authenticated no debe ejecutar el hook';
  assert not has_function_privilege('public', 'private.hook_before_user_created(jsonb)', 'execute'),
    'public no debe ejecutar el hook';
end $$;

-- Y de verdad no pueden llamarla (rol authenticated y anon).
set local role authenticated;
do $$
begin
  begin
    perform private.hook_before_user_created('{}'::jsonb);
    raise exception 'ASSERT: authenticated pudo ejecutar el hook';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

set local role anon;
do $$
begin
  begin
    perform private.hook_before_user_created('{}'::jsonb);
    raise exception 'ASSERT: anon pudo ejecutar el hook';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

rollback;

select 'google_signup_hook: OK' as resultado;
