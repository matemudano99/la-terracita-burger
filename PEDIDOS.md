# Pedidos online — guía de puesta en marcha

La web tiene un sistema de pedidos propio, sin comisiones:

- **`/pedir`** — el cliente monta su pedido y **paga online por adelantado**
  (mínimo 9 €). Puede pedir «lo antes posible» o **programarlo** para más tarde,
  incluso con el local cerrado.
- **`/cocina`** — panel para el local (móvil/tablet): suena una alarma con cada
  pedido, se acepta con un tiempo de preparación, se marca lista/entregada y se
  imprime el ticket. El flujo de un pedido a domicilio se lee **recibido →
  en cocina → en reparto → entregado**: donde uno de recogida dice «Lista para
  recoger», el de domicilio dice «Sale a reparto», y la tarjeta pasa a «🛵 EN
  REPARTO». El estado guardado es el mismo (`lista`): solo cambia el nombre
  según el tipo de entrega, también en /admin y en la pantalla del cliente.
  Pensado para **tablet en horizontal**: cada pedido es un ticket con una
  cabecera de color por estado (rojo nuevo, ámbar en cocina, verde lista,
  violeta programado) y su cronómetro — en cocina, cuánto falta para la hora
  de listo, y la cabecera se pone roja con «+X′ tarde» si se pasa. Los tickets
  van en filas por orden de urgencia y la acción principal siempre abajo. La
  barra superior filtra por estado con su contador; los **⏰ Programados** son
  los pedidos con hora futura
  (pasan solos a Nuevos con alarma cuando faltan ≤30 min). Al tocar un botón el
  ticket cambia **al instante**, sin esperar al servidor; si el servidor lo
  rechaza, vuelve a su estado y sale un aviso que no se borra solo. La alarma
  viene **activada por defecto** (el 🔔 la silencia y se recuerda); como Chrome
  no deja sonar nada hasta el primer toque, si la tablet recarga sola aparece
  una franja «Toca aquí para activar el sonido». El cliente ve el
  estado en su móvil en tiempo real. El botón **● Abierto / ⏸ Cerrado** de la
  barra superior cierra y reabre el local al instante si hay cualquier problema
  (mientras está cerrado no entra ningún pedido, tampoco programado, y el
  cliente ve el motivo y el teléfono). Desde ahí también se salta a **🛠 Admin**.
- **`/admin`** — panel de administración (solo admin): resumen de ventas
  (ingresos, ticket medio, horas punta, top productos), historial con búsqueda
  y export a CSV, gestión de cuentas de empleados y pausa de pedidos por local.
  El periodo se elige con los botones **Hoy · Ayer · 7 · 30 · 90 días · 1 año**
  o con **📅 Fechas** (dos fechas cualesquiera, sin límite de antigüedad), así
  que se puede consultar cualquier mes pasado y cuadrarlo con el banco. El
  historial abre con un **cuadre con el banco** del periodo elegido (ver abajo).
- **`/api/*`** — funciones serverless (Vercel) que validan y guardan los pedidos
  en Supabase. Los precios se recalculan siempre en el servidor.

**Acceso del equipo**: cuentas individuales con email y contraseña (Supabase
Auth — contraseñas cifradas, tokens que caducan y se renuevan solos). Dos
roles: **admin** (todo) y **empleado** (solo /cocina; opcionalmente limitado a
un local). Nadie puede registrarse por su cuenta: el admin crea las cuentas.

La sesión vive en el navegador y **la comparten todas las pestañas** del
aparato, así que cerrarla afecta a todas. Por eso `src/authClient.js` solo la
cierra cuando el servidor dice que el token ya no vale (401): un bache de WiFi
o un error pasajero de Supabase (5xx, 429 → el servidor responde 503) mantiene
la sesión y se reintenta en la siguiente consulta. Además solo se renueva una
vez a la vez —el panel de cocina consulta cada 2 s y con red lenta se solapan—
y antes de cerrar se relee lo guardado, por si otra pestaña ya había renovado.

La carta (productos y precios) vive en **`src/menu.js`** — al editarla se
actualizan a la vez la sección Carta de la portada, la página de pedidos y los
precios que valida el servidor. Los horarios están en **`src/locales.js`**.
Los **precios del día a día se cambian desde /admin** (pestaña 🍔 Carta), sin
tocar código ni desplegar: ver más abajo.

## 1. Crear la base de datos (Supabase, gratis — 10 min)

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto
   (región: Europe West). El plan gratuito sobra para esto.
2. En **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y
   pulsa **Run**.
3. En **Project Settings → API** copia dos valores:
   - **Project URL** → será `SUPABASE_URL`
   - **service_role key** (la secreta, no la `anon`) → será `SUPABASE_SERVICE_ROLE_KEY`

## 2. Configurar Vercel (5 min)

En el proyecto de Vercel → **Settings → Environment Variables**, añade:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | la URL del paso anterior |
| `SUPABASE_SERVICE_ROLE_KEY` | la clave service_role |

Después haz un **Redeploy**. Sin estas variables la web funciona igual, pero al
enviar un pedido muestra "no está configurado, llámanos".

## 3. Crear tu cuenta de admin y las de los empleados (5 min)

1. En Supabase → **Authentication → Users → Add user**: tu email y una buena
   contraseña (marca *Auto Confirm User*).
2. Dale rol de admin con el SQL que hay comentado al final de
   `supabase/schema.sql` (cámbiale el email).
3. Entra en `https://laterracitaburger.com/admin` con ese email y contraseña.
4. En la pestaña **Equipo**, crea una cuenta por persona (o una por local).
   Solo el **primer** admin se crea desde Supabase: a partir de ahí, cualquier
   admin crea cuentas de **empleado o de admin**, cambia nombre, rol y local
   (✎ Editar), pone contraseñas nuevas (🔑) y elimina cuentas. Cada cuenta
   enseña su acceso, su último inicio de sesión y su fecha de alta.
   Un empleado con local asignado solo ve los pedidos de ese local.
   Protecciones: nadie puede cambiarse el rol ni borrarse a sí mismo, y
   siempre queda al menos un admin. Las contraseñas no se pueden ver: si
   alguien olvida la suya, se le pone una nueva.

## 4. Montar el panel en cada local

**Hardware por local**: tablet Android 10" barata (o un móvil Android 9+ usado
para empezar) + soporte + cargador SIEMPRE enchufado. iPad no vale (la
impresión con RawBT es solo Android).

1. En el móvil/tablet del local, abre Chrome → `https://laterracitaburger.com/cocina`.
2. Inicia sesión con la cuenta del local y deja la pestaña abierta
   (menú de Chrome → **Añadir a pantalla de inicio** para que parezca una app).
3. **Pantalla siempre encendida** (lo más importante — la alarma solo suena con
   la página abierta): Ajustes → Pantalla → tiempo de espera al máximo, o mejor,
   instala **Fully Kiosk Browser** (gratis): mantiene la pantalla activa, abre
   /cocina al encender el aparato y evita que el personal salga a otras apps.
4. Volumen al máximo y modo "no molestar" desactivado — la alarma suena cada
   6 s mientras haya pedidos sin atender.
5. **Ensayo general** el primer día antes del servicio: haz un pedido real desde
   un móvil con datos → alarma → aceptar → ticket → entregado. Cinco minutos y
   confirmas toda la cadena.

> Punto débil a conocer: si se cae el WiFi del local, el panel deja de recibir
> pedidos. Respaldo: tablet con SIM de datos, o compartir datos de un móvil.

## 5. Impresión del ticket (~40 € por local, sin cuotas)

Compra por local:

- **Impresora térmica Bluetooth de 58 mm** compatible ESC/POS (30–45 € en
  Amazon: busca "impresora térmica bluetooth 58mm"). No necesita papel químico
  especial más allá de los rollos de 58 mm estándar.
- Un móvil/tablet Android cualquiera (vale uno viejo) para el panel.

Configuración (una vez):

1. Instala **RawBT** (Play Store, gratis) en el Android del panel.
2. Empareja la impresora por Bluetooth y selecciónala dentro de RawBT.
3. En Ajustes de Android → **Impresión**, activa el servicio de impresión RawBT.
4. En `/cocina`, al **aceptar un pedido se abre solo el diálogo de imprimir**
   (también hay botón «🖨 Ticket» en cada pedido). Elige RawBT como impresora la
   primera vez y marca recordar. El ticket sale formateado a 58 mm.

> Alternativa sin impresora: la cocina trabaja leyendo las tarjetas del panel.
> Alternativa "pro" más adelante: impresora Star con CloudPRNT (~300 €), que
> imprime sola sin móvil; requeriría un pequeño endpoint adicional.

## Desarrollo local

```bash
npm run dev
```

- Las funciones de `/api` funcionan también en desarrollo (plugin en `vite.config.js`).
- Sin `.env`, los pedidos se guardan **en memoria** (se pierden al reiniciar) y
  hay dos cuentas de prueba que NO existen en producción:
  - `admin` / `admin` → rol administrador (acceso a /admin y /cocina)
  - `cocina` / `cocina` → rol empleado (solo /cocina)
  La gestión de equipo real (pestaña Equipo) necesita Supabase.
- Con un `.env` (copia `.env.example`) puedes probar contra Supabase real.

## Protección contra pedidos falsos y fantasma

- Nada se cocina hasta que el local **acepta** el pedido en /cocina (y siempre
  tiene el teléfono del cliente para verificar los sospechosos o muy grandes).
- Un teléfono solo puede tener **1 pedido pendiente** de aceptar a la vez.
- Límites: máx. 3 pedidos por teléfono y 5 por IP cada 2 horas; máx. 500 € por
  pedido; solo en horario de apertura.
- Campo honeypot invisible que descarta bots.
- Los precios los calcula siempre el servidor: manipular la web no sirve de nada.
- **Pedidos fantasma** (nadie los recoge): en /cocina, sección Listas, botón
  «Nadie la recogió». Con 1 aviso, los próximos pedidos de ese teléfono llegan
  con una alerta ⚠️ para confirmar por teléfono antes de cocinar; con 2 en 30
  días, el teléfono queda **bloqueado** para pedir online (se le invita a
  llamar). El checkout avisa de esta norma antes de enviar.

## Promoción web (2ª hamburguesa al 50 %)

Vive en la constante `PROMO` de **`src/menu.js`**, y la aplica el servidor:

- **Qué descuenta**: por cada pareja de hamburguesas, la mitad de la más
  barata de las dos (2 → una al 50 %; 3 → una; 4 → dos). Se calcula sobre el
  **precio del producto**, no sobre extras, panes ni acompañamientos.
- **Qué cuenta como hamburguesa**: las categorías de `PROMO.categorias`
  (hoy solo `smash`, que incluye la burger del mes). Los camperos no entran.
- **Quitarla o cambiarla**: `activa: false`, o toca `pct` / `categorias`.
  El texto del cartel y del carrito sale de `nombre` / `corto` (y sus
  versiones en inglés).
- El pedido mínimo se mide sobre el total **ya con la promo aplicada**.
- El navegador solo la enseña: el importe lo recalcula siempre `/api/orders`.

Para que el ticket y el panel puedan desglosarla, ejecuta una vez en Supabase:

```sql
alter table public.pedidos
  add column if not exists promo_cents integer not null default 0;
```

Sin esa columna la promo se cobra igual de bien (el total ya va descontado),
solo que el ticket no enseña la línea «Promo web».

## Pestaña 🍔 Carta — gestionar la carta desde /admin

`src/menu.js` es la **carta base**. La pestaña **🍔 Carta** de /admin la edita
sin tocar código ni desplegar, y todo tiene vuelta atrás:

| Qué | Cómo | Dónde se guarda |
|---|---|---|
| Precio de un producto o variante | Se escribe y **Guardar**; **Volver** deja el de la carta | tabla `precios` |
| Precio de añadidos, panes y acompañamientos | Igual, en sus tres pestañas | tabla `precios` |
| Agotado, por local | Botón **Disponible / Agotado** | tabla `carta` |
| Oferta (% de descuento), por local | Campo **% dto.** | tabla `carta` |
| Nombre, descripción, etiqueta y su versión en inglés | Botón **✎ Editar** | tabla `productos` |
| Producto nuevo | **+ Nuevo producto**: categoría, textos y precios | tabla `productos` |
| Quitar un producto | **Quitar**. Si venía de la carta base se **oculta** (y se recupera desde «Ocultos»); si se creó aquí, se borra | tabla `productos` |

Cómo encaja con el código:

- Las tablas son **capas encima** de `src/menu.js`: solo guardan lo que se
  cambia. Sin filas, la carta es exactamente la del archivo.
- `fusionarCarta()` en `src/menu.js` devuelve la **carta efectiva** (base +
  cambios), y es la que usan la portada, `/carta`, `/pedir` y el servidor.
  Un producto creado desde el panel entra también en la promoción web.
- El precio lo sigue recalculando `/api/orders`, así que el navegador no puede
  colar uno; un producto oculto o agotado se rechaza aunque estuviera en el
  carrito.
- Solo el rol admin edita (`/api/precios` y `/api/productos`).
- Un producto creado desde el panel **sin versión en inglés** se ve en español
  en la web en inglés (nunca queda un hueco).

Requiere ejecutar una vez en Supabase (está entero en `supabase/schema.sql`):

```sql
create table if not exists public.precios (
  item_id    text not null,
  variant_id text not null default 'u',
  cents      integer not null check (cents >= 0),
  updated_at timestamptz not null default now(),
  primary key (item_id, variant_id)
);
alter table public.precios enable row level security;

create table if not exists public.productos (
  id             text primary key,
  categoria      text not null,
  nombre         text not null,
  nombre_en      text,
  descripcion    text,
  descripcion_en text,
  etiqueta       text,
  variantes      jsonb not null default '[]'::jsonb,
  oculto         boolean not null default false,
  updated_at     timestamptz not null default now()
);
alter table public.productos enable row level security;
```

Sin esas tablas la web funciona igual con la carta del código, y la pestaña
avisa de lo que falta.

## Pestaña 🏦 Banco — el neto real de MONEI

Lo que MONEI transfiere de verdad, sin estimar nada. El REST de MONEI solo
expone pagos, pero su **API GraphQL** (`https://graphql.monei.com`, misma clave
`MONEI_API_KEY` que ya está en Vercel) da las liquidaciones y las facturas.
Lo consulta `/api/liquidaciones` **desde el servidor** — la clave nunca llega
al navegador — y solo para el rol admin.

Por cada liquidación se ve **bruto → comisiones de adquirencia → reserva →
neto transferido**, y arriba tres cifras: lo ya recibido en el banco, lo
retenido ahora mismo y las comisiones totales (las descontadas de las
liquidaciones más las facturadas aparte por recibo domiciliado).

Dos cosas que conviene saber, confirmadas por el soporte de MONEI:

- **La reserva es rotatoria**: se retiene un 10 % de cada liquidación y se
  libera con la siguiente, que a su vez retiene el 10 % de la suya. En todo
  momento solo queda retenido el 10 % de la última.
- Un cobro devuelto el mismo día **se compensa dentro de su propia
  liquidación** (bruto 0), no se descuenta de las demás.

## Pedido mínimo, programados y reparto propio (oculto)

- **Pedido mínimo online: 9 €** (constante `PEDIDO_MINIMO_CENTS` en
  `src/menu.js`). El carrito avisa de lo que falta y el servidor lo revalida.
- **Todo prepagado**: no hay «pagar al recoger». Todo pedido se paga online
  antes de llegar a cocina. Esto elimina los pedidos fantasma.
- **Pedidos programados**: el cliente elige franja (hoy/mañana, cada 15 min,
  mín. 45 min de antelación) o «lo antes posible». Se ajusta en las constantes
  `PROGRAMAR_*` de `src/locales.js`. Requiere la columna `programado_para` (ver
  SQL abajo); si no está, la opción no aparece.
- **Reparto a domicilio propio (solo Rincón)**: implementado pero **oculto**
  tras `rincon.delivery.activo` en `src/locales.js`. Incluye **control de zona
  por distancia**: geocodifica la dirección (Nominatim/OpenStreetMap, gratis) y
  rechaza fuera de `radioKm` (4 km). Envío 1,50 €, mínimo propio 15 €. Teatinos
  no tiene reparto propio. Para estrenarlo: (1) ejecutar el SQL de columnas de
  entrega, (2) ajustar gastos/mínimo/radio y poner `activo: true`, (3)
  actualizar la sección de entrega de /condiciones (hoy dice que no hay envíos).

## Cuadre (historial de /admin)

El panel de MONEI enseña el **bruto cobrado**, pero al banco llega otra cifra.
La pestaña **📋 Historial** abre con el cuadre del periodo elegido:

| Línea | Qué es |
|---|---|
| Cobrado online | lo que enseña MONEI: todos los cobros del periodo |
| − Devoluciones | reembolsos. MONEI los cuenta como cobro; el banco los resta |
| = Neto cobrado | lo realmente ingresado por la pasarela |
| Cobrado en el local | pedidos sin pago online (los de antes del prepago): no salen en MONEI |

**Aquí no se estiman comisiones.** Lo que de verdad entra en el banco, con sus
comisiones y su reserva, está en la pestaña **🏦 Banco** (ver abajo).

> Un desfase típico: si un pedido se cobra y se devuelve en días distintos, el
> cobro puede ir en una transferencia y el reembolso descontarse de la
> siguiente, así que un periodo sale «de menos» y el otro «de más».

Los pagos empezados y no completados no se enseñan en ningún sitio: ni son
venta ni cobro. El **export CSV** incluye las columnas Cobro (online / en el
local), Total, Devuelto y Neto por pedido.

## Devoluciones (totales o por producto)

En /cocina, menú **⋯** de cada pedido pagado:
- **Cancelar pedido** (antes de entregar) → rechaza y reembolsa lo que quede.
- **Devolver dinero** → modal para reembolsar la cuenta entera, una cantidad
  libre, o **marcar solo los productos** a devolver (reclamaciones parciales).
  El servidor acumula lo devuelto y nunca deja devolver más de lo cobrado.

## Reseñas de Google

Al marcar un pedido como **entregado**, la pantalla del cliente muestra un
botón «⭐ Déjanos 5 estrellas» con el enlace del local (`reviewUrl` en
`src/locales.js` — sustituir por el enlace exacto de «escribir reseña»).

## Gestión de la carta desde cocina

En /cocina, botón **🍔 Carta**: cada local puede marcar productos como
**agotados** — en la web quedan tachados con la etiqueta "Agotado hoy" y no
se pueden pedir. El servidor lo revalida: un pedido con un producto agotado
se rechaza aunque el cliente lo tuviera en el carrito. El panel de pedidos
se actualiza cada 2 segundos.

La **hamburguesa del mes** se pide online: nombre, ingredientes y precio se
editan en `src/mesData.js` (campo `precioCents`). Las fotos van en
`assets-src/fotos` como `.jpg` y se convierten con `npm run optimize:images`
(genera los `.webp` de `public/fotos` y la imagen de compartir `og.jpg`, que
sale de la foto principal del mes). Si un mes falta la foto, la portada enseña
una de la casa en vez de romperse, pero conviene subirla.

## Pago online (MONEI)

**Todo prepagado**: el cliente paga siempre por adelantado (tarjeta, Bizum,
Apple/Google Pay en la página segura de MONEI). Cómo funciona por dentro:

- El pedido pagado online **no llega a cocina hasta que MONEI confirma el
  cobro** (webhook verificado contra su API, con comprobación de importe).
- En cocina y en el ticket aparece **💳 PAGADO — NO COBRAR** bien grande.
- Si cocina **rechaza** un pedido cobrado → **reembolso automático** (si el
  reembolso fallara, el rechazo no se completa y se avisa al panel).
- Menú **⋯** en cada tarjeta de /cocina: **Cancelar pedido** (en cualquier
  fase previa a la entrega; devuelve el dinero solo si estaba pagado) y
  **Devolver el dinero** (reembolso manual de un pedido pagado sin cambiar su
  estado — para reclamaciones después de entregar).
- Pedido pagado que nadie recoge → sin reembolso automático (comida hecha);
  se valora a mano desde el panel de MONEI.

Activación: ya está activo en producción (`MONEI_API_KEY` en Vercel). En
desarrollo local sin clave hay una pasarela simulada (`/pago-simulado`).

## SQL pendiente para las últimas mejoras

Para activar **pedidos programados** y **devoluciones parciales**, ejecuta una
vez en Supabase → SQL Editor (la web funciona sin esto: la opción de programar
no aparece y las devoluciones son totales):

```sql
alter table public.pedidos
  add column if not exists programado_para timestamptz,
  add column if not exists reembolsado_cents integer not null default 0;
```

(El bloque completo, incluidas las columnas de reparto, está en
`supabase/schema.sql`.)

## Seguimiento por WhatsApp

Tras enviar el pedido, el cliente puede pulsar «Guardar seguimiento en
WhatsApp»: se autoenvía un enlace (`/pedir?p=…`) que reabre la pantalla de
estado desde cualquier dispositivo, aunque cierre el navegador.

## Datos y RGPD

- El cliente solo da nombre y teléfono; el aviso legal y la política de
  privacidad ya reflejan este tratamiento (30 días de conservación).
- Ese borrado **anonimiza, no elimina**: los pedidos de más de 30 días siguen
  en /admin con su fecha, local, estado e importe (la contabilidad se conserva
  entera); lo que se va es el nombre, el teléfono, la nota y el detalle.
- Para cumplir la retención, activa el trabajo programado comentado al final de
  `supabase/schema.sql` (requiere la extensión pg_cron) o borra a mano de vez
  en cuando desde el Table Editor de Supabase.
