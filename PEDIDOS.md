# Pedidos online — guía de puesta en marcha

La web tiene un sistema de pedidos propio, sin comisiones:

- **`/pedir`** — el cliente elige local, monta su pedido y lo envía. Paga al recoger.
- **`/cocina`** — panel para el local (móvil/tablet): suena una alarma con cada
  pedido, se acepta con un tiempo de preparación, se marca lista/entregada y se
  imprime el ticket. El cliente ve el estado en su móvil en tiempo real.
- **`/admin`** — panel de administración (solo admin): resumen de ventas
  (ingresos, ticket medio, horas punta, top productos), historial con búsqueda
  y export a CSV, gestión de cuentas de empleados y pausa de pedidos por local.
- **`/api/*`** — funciones serverless (Vercel) que validan y guardan los pedidos
  en Supabase. Los precios se recalculan siempre en el servidor.

**Acceso del equipo**: cuentas individuales con email y contraseña (Supabase
Auth — contraseñas cifradas, tokens que caducan y se renuevan solos). Dos
roles: **admin** (todo) y **empleado** (solo /cocina; opcionalmente limitado a
un local). Nadie puede registrarse por su cuenta: el admin crea las cuentas.

La carta (productos y precios) vive en **`src/menu.js`** — al editarla se
actualizan a la vez la sección Carta de la portada, la página de pedidos y los
precios que valida el servidor. Los horarios están en **`src/locales.js`**.

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
4. En la pestaña **Equipo**, crea una cuenta por empleado (o una por local).
   Si le asignas un local, solo verá los pedidos de ese local.

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

## Gestión de la carta desde cocina

En /cocina, botón **🍔 Carta**: cada local puede marcar productos como
**agotados** — en la web quedan tachados con la etiqueta "Agotado hoy" y no
se pueden pedir. El servidor lo revalida: un pedido con un producto agotado
se rechaza aunque el cliente lo tuviera en el carrito. El panel de pedidos
se actualiza cada 2 segundos.

La **hamburguesa del mes** se pide online: nombre, ingredientes y precio se
editan en `src/mesData.js` (campo `precioCents`).

## Seguimiento por WhatsApp

Tras enviar el pedido, el cliente puede pulsar «Guardar seguimiento en
WhatsApp»: se autoenvía un enlace (`/pedir?p=…`) que reabre la pantalla de
estado desde cualquier dispositivo, aunque cierre el navegador.

## Datos y RGPD

- El cliente solo da nombre y teléfono; el aviso legal y la política de
  privacidad ya reflejan este tratamiento (30 días de conservación).
- Para cumplir la retención, activa el trabajo programado comentado al final de
  `supabase/schema.sql` (requiere la extensión pg_cron) o borra a mano de vez
  en cuando desde el Table Editor de Supabase.
