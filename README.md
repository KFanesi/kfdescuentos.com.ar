# KFDescuentos

Sitio de cupones de descuento de Mercado Libre. Es un sitio independiente: no es un sitio oficial de Mercado Libre.

## Cómo cargar, cambiar o quitar cupones

No hace falta saber de informática. Todo se hace desde el navegador, editando un solo archivo: **`assets/data/coupons.json`**.

> Para poder guardar cambios necesitás una cuenta de GitHub con permiso de escritura en este repositorio y, por seguridad, la **verificación en dos pasos** activada en tu cuenta.

El sitio **no muestra el código del cupón**: cada tarjeta lleva a la lista de Mercado Libre, donde se ve el cupón y sus condiciones. Por eso acá no se carga ningún código.

### Abrir el archivo

1. Entrá a este repositorio en GitHub.
2. Abrí la carpeta `assets`, después `data`, y hacé clic en **`coupons.json`**.
3. Tocá el ícono del **lápiz** (arriba a la derecha) para editarlo.

### Agregar una tarjeta

Cada tarjeta es un bloque entre llaves `{ ... }`. Todos los bloques están dentro de corchetes `[ ... ]` y van **separados por una coma**. El último bloque **no lleva coma** al final.

Copiá este bloque, pegalo **justo después del corchete `[` de arriba** y completá lo que corresponda:

```json
  {
    "id": "cupones-disponibles-2",
    "brand": "Mercado Libre",
    "title": "Cupones Disponibles",
    "description": "Entrá a la lista de Mercado Libre para ver los cupones.",
    "conditions": "Revisá las condiciones y el vencimiento en Mercado Libre antes de usarlo.",
    "diario": false,
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
| `id` | Un nombre único para la tarjeta, en minúsculas y sin espacios. No puede repetirse. |
| `title` | El título que se ve en la tarjeta. Por ejemplo `Cupones Disponibles`. Se puede cambiar cuando quieras. |
| `description` y `conditions` | Textos cortos. Podés dejarlos como están en el ejemplo, o borrar la línea si no querés mostrarlos. |
| `discount` | **Opcional.** Por ejemplo `10% OFF`. Si no lo sabés, no agregues esa línea: no se inventa nada. |
| `diario` | `true` si es un cupón diario: aparece **siempre primero** y con la etiqueta "Cupón diario". `false` si no. |
| `publishedAt` | La fecha de hoy, con este formato: `AAAA-MM-DD`. Entre los que no son diarios, se muestra primero el más nuevo. |
| `expiresAt` | `null` si no vence. Si vence, la fecha entre comillas: `"2026-12-31"`. El día siguiente la tarjeta desaparece sola. |
| `url` | El enlace de la lista, tal como lo da Mercado Libre. **No lo cambies ni le agregues nada.** Tiene que ser de `meli.la` o de `mercadolibre.com.ar`. |
| `active` | `true` para que se vea. `false` para ocultarla sin borrarla. |

### Ocultar o quitar una tarjeta

- **Ocultarla (lo más simple):** cambiá `"active": true` por `"active": false`.
- **Quitarla:** borrá el bloque entero, de `{` a `}`, y su coma. Cuidado de no dejar una coma de más ni de menos.

### Guardar

1. Tocá el botón verde **Commit changes...** (arriba a la derecha).
2. En la ventana que se abre, tocá de nuevo **Commit changes**.
3. Esperá unos minutos (hasta 10) y mirá la sección de cupones del sitio. Si no ves el cambio, recargá la página sin caché (Cmd+Shift+R en Mac, Ctrl+Shift+R en Windows).

### Si algo sale mal

- Una coma, una comilla o una llave de más o de menos rompe el formato. **El sitio no se cae**: solo muestra "No pudimos cargar los cupones" hasta que se corrija.
- **Volver atrás:** abrí el archivo `coupons.json` y tocá **History** (arriba a la derecha). Ahí aparece cada cambio guardado, con su fecha. Entrá al último que funcionaba, abrí el archivo tal como estaba en ese momento, copiá todo su contenido y pegalo en la versión actual con el lápiz. Si no te sale, pedile ayuda a quien administra el repositorio.
- Una tarjeta con algún dato inválido (por ejemplo una fecha mal escrita, un `id` repetido o un enlace que no es de Mercado Libre) **no se muestra**, pero no afecta a las demás.

### Reglas simples

- No inventes descuentos ni fechas: si no los sabés, dejalos afuera.
- El enlace de afiliado se usa **exactamente** como lo entrega el programa.
- Los cupones pertenecen a Mercado Libre y pueden cambiar o vencer.
- Cualquier otro cambio del sitio (textos, redes, diseño) no se hace desde acá.
