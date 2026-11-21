# KFDescuentos

Sitio de cupones de descuento de Mercado Libre. Es un sitio independiente: no es un sitio oficial de Mercado Libre.

## Cómo cargar, cambiar o quitar cupones

No hace falta saber de informática. Todo se hace desde el navegador, editando un solo archivo: **`assets/data/coupons.json`**.

> Para poder guardar cambios necesitás una cuenta de GitHub con permiso de escritura en este repositorio y, por seguridad, la **verificación en dos pasos** activada en tu cuenta.

### Abrir el archivo

1. Entrá a este repositorio en GitHub.
2. Abrí la carpeta `assets`, después `data`, y hacé clic en **`coupons.json`**.
3. Tocá el ícono del **lápiz** (arriba a la derecha) para editarlo.

### Agregar un cupón

Cada cupón es un bloque entre llaves `{ ... }`. Todos los bloques están dentro de corchetes `[ ... ]` y van **separados por una coma**. El último bloque **no lleva coma** al final.

Copiá este bloque, pegalo **justo después del corchete `[` de arriba** y completá lo que está en mayúsculas:

```json
  {
    "id": "cupon-codigo",
    "brand": "Mercado Libre",
    "title": "Cupón CODIGO",
    "code": "CODIGO",
    "discount": "10% OFF",
    "description": "Lista de productos de Mercado Libre para usar con el cupón CODIGO.",
    "conditions": "Revisá las condiciones y el vencimiento en Mercado Libre antes de usarlo.",
    "exclusive": false,
    "publishedAt": "2026-11-21",
    "expiresAt": null,
    "url": "https://meli.la/1hVcei8",
    "active": true
  },
```

Lo importante, campo por campo:

| Campo | Qué poner |
|---|---|
| `id` | Un nombre único para el cupón, en minúsculas y sin espacios. Ejemplo: `cupon-corazon`. No puede repetirse. |
| `code` | El código tal cual, sin espacios. Ejemplo: `CORAZON`. |
| `title` | El título que se muestra. Ejemplo: `Cupón CORAZON`. |
| `discount` | **Opcional.** Por ejemplo `10% OFF`. Si no lo sabés, **borrá esa línea entera**: no se inventa nada. |
| `description` y `conditions` | Textos cortos. Podés dejarlos como están en el ejemplo. |
| `publishedAt` | La fecha de hoy, con este formato: `AAAA-MM-DD`. |
| `expiresAt` | `null` si no vence. Si vence, la fecha entre comillas: `"2026-12-31"`. El día siguiente el cupón desaparece solo. |
| `url` | El enlace de la lista, tal como lo da Mercado Libre. **No lo cambies ni le agregues nada.** Tiene que empezar con `https://`. |
| `active` | `true` para que se vea. `false` para ocultarlo sin borrarlo. |

Los cupones nuevos van **primero**: la página de inicio muestra los primeros del archivo.

### Ocultar o quitar un cupón

- **Ocultarlo (lo más simple):** cambiá `"active": true` por `"active": false`.
- **Quitarlo:** borrá el bloque entero, de `{` a `}`, y su coma. Cuidado de no dejar una coma de más ni de menos.

### Guardar

1. Tocá el botón verde **Commit changes...** (arriba a la derecha).
2. En la ventana que se abre, tocá de nuevo **Commit changes**.
3. Esperá unos minutos (hasta 10) y mirá la sección de cupones del sitio. Si no ves el cambio, recargá la página sin caché (Cmd+Shift+R en Mac, Ctrl+Shift+R en Windows).

### Si algo sale mal

- Una coma, una comilla o una llave de más o de menos rompe el formato. **El sitio no se cae**: solo muestra "No pudimos cargar los cupones" hasta que se corrija.
- **Volver atrás:** abrí el archivo `coupons.json` y tocá **History** (arriba a la derecha). Ahí aparece cada cambio guardado, con su fecha. Entrá al último que funcionaba, abrí el archivo tal como estaba en ese momento, copiá todo su contenido y pegalo en la versión actual con el lápiz. Si no te sale, pedile ayuda a quien administra el repositorio.
- Un cupón con algún dato inválido (por ejemplo una fecha mal escrita o un enlace que no es de Mercado Libre) **no se muestra**, pero no afecta a los demás.

### Reglas simples

- No inventes descuentos ni fechas: si no los sabés, dejalos afuera.
- El enlace de afiliado se usa **exactamente** como lo entrega el programa.
- Los cupones y precios pertenecen a Mercado Libre y pueden cambiar o vencer.
- Cualquier otro cambio del sitio (textos, redes, diseño) no se hace desde acá.
