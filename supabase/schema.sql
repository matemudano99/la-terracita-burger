-- Tabla de pedidos online de La Terracita Burger.
-- Ejecuta este archivo una vez en Supabase: SQL Editor → New query → pegar → Run.

create table if not exists public.pedidos (
  id          uuid primary key,
  code        text not null,
  local       text not null,
  nombre      text not null,
  telefono    text not null,
  items       jsonb not null,
  nota        text,
  ip          text,
  alerta      text,
  total_cents integer not null,
  status      text not null default 'nuevo',
  ready_at    timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists pedidos_local_created on public.pedidos (local, created_at desc);
create index if not exists pedidos_created on public.pedidos (created_at desc);
create index if not exists pedidos_telefono on public.pedidos (telefono, created_at desc);

-- La API del servidor usa la clave service_role (que ignora RLS).
-- Activamos RLS sin políticas para que NADIE pueda leer/escribir con la clave
-- pública (anon) si algún día se filtrara.
alter table public.pedidos enable row level security;

-- Estado de la carta por local: agotados y descuentos, gestionado desde
-- /cocina (botón Carta). Un producto sin fila = disponible y sin descuento.
create table if not exists public.carta (
  local      text not null,
  item_id    text not null,
  agotado    boolean not null default false,
  descuento  integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (local, item_id)
);
alter table public.carta enable row level security;

-- Pagos online (MONEI). El pedido nace en "pendiente_pago" y solo pasa a
-- cocina cuando el webhook confirma el cobro.
alter table public.pedidos
  add column if not exists pago_metodo text not null default 'local',
  add column if not exists pago_estado text,
  add column if not exists pago_id text;
create index if not exists pedidos_pago_id on public.pedidos (pago_id);

-- Reparto propio a domicilio (oculto hasta activar delivery.activo en
-- src/locales.js; ejecutar este bloque antes de activarlo).
alter table public.pedidos
  add column if not exists entrega text not null default 'recogida',
  add column if not exists direccion text,
  add column if not exists envio_cents integer not null default 0;

-- Pedidos programados (para más tarde / fuera de horario) y devoluciones
-- parciales (importe acumulado ya reembolsado de un pedido). Sin este bloque,
-- la web sigue funcionando: la opción de programar no aparece y las
-- devoluciones son totales.
alter table public.pedidos
  add column if not exists programado_para timestamptz,
  add column if not exists reembolsado_cents integer not null default 0;

-- Promoción web aplicada al pedido (2ª hamburguesa al 50 %). Sin esta columna
-- la promo se cobra igual de bien: el total ya viene descontado, pero no se
-- puede desglosar en el ticket ni en el panel.
alter table public.pedidos
  add column if not exists promo_cents integer not null default 0;

-- Ajustes por local: pausar pedidos online desde /admin (pestaña Ajustes).
create table if not exists public.ajustes (
  local      text primary key,
  pausado    boolean not null default false,
  motivo     text,
  updated_at timestamptz not null default now()
);
alter table public.ajustes enable row level security;
insert into public.ajustes (local) values ('teatinos'), ('rincon')
  on conflict (local) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- CUENTA DE ADMINISTRADOR (hazlo una vez):
-- 1. Supabase → Authentication → Users → "Add user" → email + contraseña
--    (marca "Auto Confirm User").
-- 2. Ejecuta esto (cambia el email) para darle el rol de admin:
--
-- update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--       || '{"rol":"admin"}'::jsonb,
--       raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
--       || '{"nombre":"Mateo"}'::jsonb
--   where email = 'laterracita.burgers@gmail.com';
--
-- Con esa cuenta entras en /admin y desde ahí creas las cuentas de empleados
-- (que solo pueden usar /cocina). Nadie puede registrarse por su cuenta.
-- ─────────────────────────────────────────────────────────────────────────────

-- RGPD: borrado de datos personales pasados 30 días (los importes se conservan
-- anonimizados). Requiere la extensión pg_cron (Database → Extensions → pg_cron).
-- Si prefieres no activarla, puedes borrar a mano desde Table Editor.
-- select cron.schedule('limpiar-pedidos', '0 5 * * *',
--   $$update public.pedidos set nombre = '—', telefono = '—', nota = null,
--     ip = null, items = '[]'::jsonb where created_at < now() - interval '30 days'$$);
