# Environments de GitHub Actions

Estado real de `kefaroTech/vetsoftware-public-web`, **verificado el 2026-08-20** con
`gh api repos/kefaroTech/vetsoftware-public-web/environments`. Si al leer esto la realidad no
coincide, manda la API y hay que corregir este fichero.

## Qué hay hoy

| Environment           | Workflow              | Secretos                                        | Variables                 | Ramas permitidas     | Revisores requeridos |
| --------------------- | --------------------- | ----------------------------------------------- | ------------------------- | -------------------- | -------------------- |
| `development`         | `deploy-dev.yml`      | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | `VITE_RECAPTCHA_SITE_KEY` | `develop`            | 0                    |
| `production`          | `publish-release.yml` | **ninguno**                                     | **ninguna**               | `main`, `release/**` | 1 (`@Kefaro`)        |
| `release-preparation` | `prepare-release.yml` | **ninguno**                                     | **ninguna**               | `release/**`         | 0                    |

**No hay red de seguridad detrás.** Los secretos y las variables a nivel de repositorio y a
nivel de organización están los cuatro listados **vacíos** (`total_count: 0`). Lo que no esté
en el environment no existe: `${{ vars.X }}` se resuelve a cadena vacía, sin aviso.

## Dos cadenas de despliegue distintas

No comparten ni proveedor ni credenciales, y por eso que desarrollo funcione no dice nada de
producción:

- **Desarrollo → Cloudflare Pages** (`deploy-dev.yml`, proyecto `vetsoftware-public-front-dev`).
  Publica con un API token de Cloudflare. Es la única cadena con credenciales configuradas.
- **Producción → imagen en Amazon ECR** (`publish-release.yml`, repositorio
  `vetsoftware-public-front`). Se autentica por OIDC asumiendo un rol de AWS; no hay claves
  estáticas. Hoy **no puede ejecutarse**: sin `AWS_ECR_PUBLISH_ROLE_ARN` no hay rol que asumir.

## Lo que falta configurar en `production` antes de la primera release

Ambas son **variables** (`vars`), no secretos: el ARN del rol no es sensible y la site key de
reCAPTCHA es pública por definición (viaja en el HTML). Sustituye los marcadores por los
valores reales; aquí no hay ninguno inventado.

```bash
gh api -X POST repos/kefaroTech/vetsoftware-public-web/environments/production/variables \
  -f name=AWS_ECR_PUBLISH_ROLE_ARN -f value='<arn-del-rol>'

gh api -X POST repos/kefaroTech/vetsoftware-public-web/environments/production/variables \
  -f name=VITE_RECAPTCHA_SITE_KEY -f value='<clave-de-produccion>'
```

Para corregir una que ya exista, `-X PATCH .../variables/<NOMBRE>`.

El step `Validate AWS publication configuration` de `publish-release.yml` comprueba las dos y
corta en segundos si falta alguna. Está deliberadamente colocado justo después de validar la
versión, antes de instalar dependencias y compilar.

### Aviso sobre la clave de reCAPTCHA

`VITE_RECAPTCHA_SITE_KEY` **no vale sola**. Su pareja, `RECAPTCHA_SECRET`, tiene que estar
configurada en el backend de producción y ser del mismo par de claves. Si no lo está, o si son
de pares distintos, el widget carga y se pone en verde pero el backend rechaza todos los
tokens: **ningún registro nuevo se crea**, y el usuario solo ve un error genérico.

## Deuda conocida

- **`release-preparation` no es una puerta de aprobación.** Solo tiene `branch_policy`
  (`release/**`) y **cero revisores requeridos**, así que `prepare-release.yml` se ejecuta sin
  que nadie apruebe nada — el nombre sugiere lo contrario. `production` sí exige un revisor
  (`@Kefaro`). **Decisión pendiente**, no tomada aquí: o se le configuran `required_reviewers`,
  o se asume explícitamente que solo restringe la rama y el nombre induce a error.
- **La `VITE_RECAPTCHA_SITE_KEY` de `development` no aporta nada.** Vale exactamente lo mismo
  que el fallback de desarrollo que ya trae el código
  (`src/features/registration/composables/useRecaptcha.ts`): la llave de TEST pública de Google,
  que aprueba siempre. Configurarla o no configurarla da el mismo build.

Ver también [`docs/GESTION_DE_SECRETOS.md`](../docs/GESTION_DE_SECRETOS.md), que cubre por qué
ningún valor `VITE_*` es un secreto.
