# Plan de implementación: pagos online con MONEI

Objetivo: checkout **híbrido** — el cliente elige "💳 Pagar ahora (tarjeta,
Bizum, Apple/Google Pay)" o "💶 Pagar al recoger" (el flujo actual, que no
cambia). Ningún pedido pagado llega a cocina sin confirmación real del cobro,
y si cocina rechaza un pedido pagado, el reembolso es automático.

## 0. Qué necesito de Mateo antes de empezar

- [ ] Cuenta MONEI **verificada** (CIF, IBAN, DNI del representante).
- [ ] **API key de test** y **API key live** (MONEI → Settings → API Access).
      Las metemos en Vercel como `MONEI_API_KEY` (y `.env` local con la de test).
- [ ] Decisión de negocio: si un pedido **pagado** queda **sin recoger**,
      ¿se reembolsa? Propuesta: **no** (la comida se hizo; se valora caso a
      caso a mano desde el panel de MONEI). Rechazado por cocina → reembolso
      automático siempre.
- [ ] Visto bueno de la gestoría a las condiciones de compra (opcional pero
      recomendable).

## 1. Flujo técnico (página de pago alojada de MONEI)

1. Cliente pulsa ENVIAR con "pagar ahora" → `POST /api/orders` crea el pedido
   con `status: "pendiente_pago"` (NO visible en cocina) y llama a MONEI
   `POST /v1/payments` con `amount` (céntimos), `currency: EUR`,
   `orderId` (nuestro id), `completeUrl` (→ `/pedir?p=<id>.<code>`),
   `cancelUrl` (→ `/pedir` con aviso), `callbackUrl` (→ `/api/pago-webhook`).
2. Respondemos al navegador con el `redirectUrl` de MONEI → el cliente paga
   en la página segura de MONEI (tarjeta/Bizum/Apple/Google Pay, 3D Secure).
3. **La verdad la dice el webhook**, no el redirect: MONEI hace POST a
   `/api/pago-webhook` con el objeto Payment y cabecera `MONEI-Signature`
   (verificación HMAC con la API key — obligatoria).
   - `SUCCEEDED` → pedido pasa a `nuevo` + `pago_estado: "pagado"` → cocina
     lo ve (con badge PAGADO) y suena la alarma.
   - `FAILED` / `CANCELED` / caducado → el pedido se queda en
     `pendiente_pago` y se ignora (limpieza: los `pendiente_pago` de más de
     1 h no cuentan para nada y el historial los archiva).
4. Rechazo de un pedido pagado desde cocina → `POST /v1/payments/{id}/refund`
   automático + `pago_estado: "reembolsado"` + se le muestra al cliente
   "pedido rechazado, te hemos devuelto el importe".

## 2. Cambios en base de datos (SQL para ejecutar en Supabase)

```sql
alter table public.pedidos
  add column if not exists pago_metodo text not null default 'local',   -- 'local' | 'online'
  add column if not exists pago_estado text,                            -- null | 'pendiente' | 'pagado' | 'reembolsado'
  add column if not exists pago_id text;                                -- id del payment en MONEI
create index if not exists pedidos_pago_id on public.pedidos (pago_id);
```

Interacciones con el antiabuso (importante):
- `pendiente_pago` NO cuenta como "pedido pendiente" del teléfono (si el pago
  falla, el cliente debe poder reintentar).
- El panel de cocina y la alarma ignoran `pendiente_pago`.
- Un pedido pagado se salta la alerta de no-shows (quien paga por adelantado
  no puede ser fantasma).

## 3. Archivos a tocar

| Archivo | Cambio |
|---|---|
| `api/_monei.js` (nuevo) | Helper REST: crear pago, reembolsar, verificar firma del webhook. Sin dependencias npm (fetch + crypto HMAC). |
| `api/orders.js` | Rama "pagar ahora": crea pedido `pendiente_pago` + payment MONEI y devuelve `redirectUrl`. Reembolso automático en `rechazado` si `pago_estado = pagado`. Excluir `pendiente_pago` de panel/antiabuso. |
| `api/pago-webhook.js` (nuevo) | Verifica `MONEI-Signature`, procesa SUCCEEDED/FAILED, idempotente (un webhook repetido no duplica nada). Responde 200 siempre que la firma sea válida. |
| `src/pedir/PedirPage.jsx` | Selector de método de pago en el checkout; redirect a MONEI; al volver por `completeUrl` el seguimiento muestra "confirmando pago…" hasta que el webhook lo pase a `nuevo`; estado "reembolsado" en seguimiento. |
| `src/cocina/CocinaPage.jsx` + Ticket | Badge grande **💳 PAGADO — NO COBRAR** vs **💶 COBRAR AL RECOGER** en tarjeta y ticket impreso (crítico para el personal). |
| `src/admin/AdminPage.jsx` | Historial: método y estado de pago; Resumen: ingresos separados online vs al recoger. |
| `src/LegalPage.jsx` | Nueva página "Condiciones de compra" + actualizar privacidad (MONEI como encargado del pago; nunca vemos el nº de tarjeta) + quitar del aviso legal la frase "no se realizan pagos a través de la web". |
| `supabase/schema.sql` | Columnas nuevas (SQL de arriba). |
| `PEDIDOS.md` | Sección de pagos: alta, claves, reembolsos, día a día. |

## 4. Activación gradual (sin sustos)

- Nuevo ajuste por local `pago_online` (en la tabla `ajustes`): el botón
  "Pagar ahora" solo aparece si está activo. Se estrena en **Rincón** unos
  días con importes reales pequeños, y luego Teatinos.
- Todo se desarrolla y prueba primero con la **API key de test** de MONEI
  (tarjetas de prueba + simulador de Bizum) en local y en un deploy con la
  key de test; el paso a live es solo cambiar la variable en Vercel.

## 5. Pruebas antes de estrenar

1. Pago con tarjeta de test → webhook → aparece en cocina con badge PAGADO →
   ticket dice NO COBRAR.
2. Pago cancelado/fallido → el pedido nunca llega a cocina; el cliente puede
   reintentar o elegir "pagar al recoger".
3. Rechazo de pedido pagado → reembolso automático visible en MONEI test.
4. Webhook duplicado / firma inválida → sin efectos (idempotencia + 401).
5. Manipulación del importe desde el navegador → imposible (el importe lo
   calcula el servidor, como siempre).
6. Pedido "pagar al recoger" → flujo idéntico al actual (regresión cero).

## 6. Estimación

- Desarrollo + pruebas en test: una sesión larga de trabajo (~1 día).
- Paso a live: 10 minutos (variable en Vercel + pedido real de 1 € y su
  reembolso como prueba final).

Comisiones acordadas de referencia (jul 2026): tarjeta nacional 0,45 %,
UE 1,65 %, Bizum ~1,34 % + 0,34 € + 0,17 €. Sin cuota mensual del plan online.
