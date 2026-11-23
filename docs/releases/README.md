# Releases

Cada versión termina con un APK firmado publicado como _pre-release_ en GitHub Releases.

## Versiones

- Formato `v0.N.P`: **N** = versión de la sesión de trabajo (cada sesión con cambios nuevos sube N),
  **P** = parche dentro de esa versión (empieza en 0).
- Hasta la v0.15.0, N salía del número de fase y las notas decían `# Fase N — …`; desde la v0.15.1 el
  trabajo se nombra solo por versión (D152).
- **Una versión = un release:** antes de lanzar, revisa los releases existentes y usa el siguiente
  número libre. Si dos sesiones usan el mismo, el APK de una pisa al de la otra (D32).
- `v1.0.0` en adelante deja de ser pre-release.
- `versionName` = versión sin la "v"; `versionCode` = número de ejecución del workflow.

## Notas de cada release

Cada versión necesita `docs/releases/<version>.md`. **La primera línea es el título del release**,
con la misma versión y este formato exacto (el workflow lo lee si no se le pasa `titulo`):

```
# v0.15.1 — Nombre corto de lo que trae
```

Las notas viejas con `# Fase N — Nombre` siguen funcionando (título `Fase N — Nombre — vX.Y.Z`).

El resto es el cuerpo del release (requisitos previos, cómo instalar, qué probar).
Si falta el archivo, el workflow falla con un mensaje claro.

## Imagen de novedades (D154)

Cuando el usuario la pida ("hazme la imagen de la actualización"), se genera una imagen para
compartir con las novedades de la **última versión publicada**, pensada **para el público** (no la
lista de "Qué probar"):

1. Escribe `docs/releases/novedades/<versión>.md`: una línea `# Subtítulo` opcional (una frase) y
   de 2 a 5 renglones `- **Título corto**: detalle`. Con la voz de la app (`docs/CONTENT.md`):
   tuteo, frases cortas, beneficios en lugar de nombres técnicos (nada de "snapshot", "RPC", "D153"
   ni números de dp), sin emojis (la fuente del render no los dibuja). Si la versión trae un solo
   cambio, se parte en sus beneficios visibles; nunca se inventa una novedad.
2. `npm run update-card -- <versión>` → `docs/releases/img/<versión>.png`.
3. Revisa la imagen (que mida **1080×1350**; si crece, recorta texto) y mándasela al usuario.

La imagen la arma `scripts/gen-update-card.mjs` con el sistema de diseño (DISENO §2–§3): tema claro
(Hueso, Arena, Tinta, Grafito), símbolo y wordmark con la "o" partida en Sandía y Mango,
Bricolage 800 para "vX.Y.Z" y Albert Sans para el texto, la etiqueta "Actualización", la caja
"Lo nuevo" con viñetas de media luna y el pie "Actualiza en Más → Buscar versión nueva". Si cambia
la marca, se cambia el script, no cada imagen.

## Aviso dentro de la app (D107)

Desde la v0.12.3, la app revisa GitHub Releases al abrir y avisa en Inicio cuando hay un APK más
nuevo (y en **Más → Buscar versión nueva**). Se ofrece cualquier release `vN.N.N` con un `.apk`,
incluidos los pre-releases, en cuanto se publica.

- Si un APK **no debe instalarse todavía** (necesita un deploy del servidor que no se ha hecho, o es
  un spike de prueba), pon `<!-- sin-aviso -->` en sus notas. Cuando ya se pueda, quita la marca
  editando el release en GitHub (o `gh release edit vX.Y.Z --notes-file ...`): la app lo lee en
  vivo, no hace falta recompilar.
- El APK se descarga en el navegador del celular; Android lo instala encima (misma firma y
  `versionCode` mayor), sin perder la sesión.
- La API se consulta **sin token**, así que el repo (`GITHUB_REPO` en `src/constants/app.ts`)
  tiene que ser **público**; si es privado, la app nunca encuentra versiones nuevas.
- Los builds para **Play Store** (`distribucion=play`) no traen el buscador: Play prohíbe que una
  app se actualice por fuera de Play (D138).

## Build para Play Store

`release-apk.yml` con `distribucion=play` compila un **AAB** (`ahorita-vX.Y.Z-play.aab`) con
`EXPO_PUBLIC_DISTRIBUTION=play` y lo deja como artifact de la corrida (no crea release en GitHub).
Ese archivo se sube a mano en Play Console. El `versionCode` es el número de corrida, así que
siempre crece y no choca entre los APK de GitHub y los AAB de Play.

## Cómo lanzar

- **Desde GitHub:** Actions → _Release APK_ → _Run workflow_; llena `ref` (rama o commit),
  `titulo` (opcional si las notas tienen el encabezado) y `version` (p. ej. `v0.15.1`).
- **Con CLI:** `gh workflow run release-apk.yml -f ref=<rama> -f version=v0.15.1`.
- **Con tag:** `git tag v0.0.1 && git push origin v0.0.1` (el título sale de las notas).

Si el release ya existe, se reemplaza el APK y las notas (útil para reintentos).

## Secretos (Settings → Secrets and variables → Actions)

Requeridos: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Opcionales (fases futuras): `GOOGLE_SERVICES_JSON_BASE64` (Fase 4), `GOOGLE_MAPS_API_KEY` (Fase 7).
