# 🎰 LuDmySpin — Motor de Slots (Créditos Virtuales)

> Plataforma de tragamonedas con créditos virtuales. Lógica de juego 100% server-side, RNG verificable (*provably fair*) y saldos con integridad transaccional. Proyecto de aprendizaje / portfolio — **sin dinero real**.

![status](https://img.shields.io/badge/status-en%20desarrollo-yellow)
![license](https://img.shields.io/badge/license-MIT-blue)
![node](https://img.shields.io/badge/node-%3E%3D20-green)

---

## Tabla de contenidos

- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelo de datos](#modelo-de-datos)
- [API](#api)
- [Provably Fair](#provably-fair)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Cálculo de RTP](#cálculo-de-rtp)
- [Roadmap](#roadmap)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Licencia](#licencia)

---

## Características

- **Lógica de juego en el servidor.** El cliente solo renderiza animaciones; el resultado de cada giro se decide en el backend.
- **RNG verificable (provably fair).** Esquema `serverSeed + clientSeed + nonce` con commit-reveal: el jugador puede reproducir y auditar cualquier giro.
- **Saldos transaccionales.** Cada giro (descuento de apuesta + acreditación de premio) ocurre en una única transacción atómica con bloqueo de fila.
- **RTP configurable por slot.** El retorno al jugador se deriva matemáticamente de la composición de los rodillos y la tabla de pagos.
- **Historial auditable.** Cada giro se persiste con sus semillas y resultado para reproducción.
- **Multi-slot.** El motor es agnóstico al juego: cada slot es una configuración de rodillos + paytable.

---

## Stack tecnológico

| Capa            | Tecnología                       | Por qué                                              |
|-----------------|----------------------------------|------------------------------------------------------|
| Backend         | Node.js 20 + Fastify             | Rápido, ligero, buen soporte de WebSockets           |
| Base de datos   | PostgreSQL 16                    | Transacciones ACID, integridad de saldos             |
| Caché / sesiones| Redis                            | Sesiones, rate-limiting, saldos en caché             |
| ORM / queries   | Drizzle ORM (o `pg` a pelo)      | Tipado, migraciones versionadas                      |
| Auth            | JWT (access + refresh)           | Stateless, simple para una SPA                        |
| Frontend        | React + Vite + Canvas/PixiJS     | Animaciones de rodillos fluidas                      |
| Tiempo real     | WebSocket (ws / Socket.io)       | Giros instantáneos, jackpots compartidos (futuro)    |
| Tests           | Vitest                           | Unit del motor + integración de la API               |
| Infra           | Docker Compose (dev), Railway    | Reproducible en local; deploy sencillo                |

---

## Arquitectura

```
┌─────────────┐      HTTPS / WS       ┌──────────────────────────┐
│   Cliente   │ ───── "girar" ──────▶ │        API (Fastify)     │
│  React/Pixi │                       │  ┌────────────────────┐  │
│             │ ◀──── resultado ───── │  │  Slot Engine (RNG) │  │
└─────────────┘   (símbolos + payout) │  └────────────────────┘  │
                                      │  ┌────────────────────┐  │
                                      │  │   Wallet Service   │  │
                                      │  └─────────┬──────────┘  │
                                      └────────────┼─────────────┘
                                                   │ TX atómica
                                        ┌──────────▼──────────┐
                                        │     PostgreSQL      │
                                        │  users · wallets    │
                                        │  spins · slots      │
                                        └─────────────────────┘
```

**Principio rector:** el cliente nunca calcula resultados ni saldos. Pide "girar" y recibe un resultado ya decidido y persistido. Manipular el frontend no cambia nada del juego.

---

## Estructura del proyecto

```
luckyspin/
├── docker-compose.yml
├── .env.example
├── README.md
│
├── packages/
│   ├── engine/                  # Motor de slots — SIN dependencias de servidor
│   │   ├── src/
│   │   │   ├── rng.ts           # provably fair: HMAC-SHA256(seed, ...)
│   │   │   ├── spin.ts          # función pura: (bet, seeds, sessionState?) -> SpinResult { steps[], payout, features }
│   │   │   ├── types.ts         # SpinResult con forma extensible (1+ pasos) desde el día uno
│   │   │   ├── features/        # funciones especiales (vacío al inicio; encaja sin tocar el core)
│   │   │   │   ├── freeSpins.ts
│   │   │   │   └── cascade.ts
│   │   │   ├── rtp.ts           # simulador / calculador de RTP
│   │   │   └── slots/
│   │   │       ├── classic.ts   # config de un slot (rodillos + paytable + min/max bet)
│   │   │       └── fruits.ts
│   │   └── tests/
│   │       ├── spin.test.ts
│   │       └── rtp.test.ts      # verifica que el RTP esté en rango
│   │
│   ├── api/                     # Servidor HTTP / WS
│   │   ├── src/
│   │   │   ├── index.ts         # bootstrap Fastify
│   │   │   ├── db/
│   │   │   │   ├── schema.ts    # tablas (Drizzle)
│   │   │   │   ├── client.ts
│   │   │   │   └── migrations/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts      # POST /auth/login, /auth/change-password
│   │   │   │   ├── spin.ts      # POST /slots/:id/spin
│   │   │   │   ├── wallet.ts    # GET /wallet
│   │   │   │   ├── fairness.ts  # GET /fairness/:spinId  (verificación)
│   │   │   │   ├── admin.ts     # /admin/* (slots, stats, jugadores)
│   │   │   │   └── owner.ts     # /owner/* (roles, config global)
│   │   │   ├── services/
│   │   │   │   ├── wallet.ts    # lógica de saldo + TX atómica
│   │   │   │   ├── credit.ts    # distribución de crédito (owner→admin→jugador)
│   │   │   │   └── fairness.ts  # commit/reveal de semillas
│   │   │   ├── plugins/
│   │   │   │   ├── auth.ts      # verificación JWT
│   │   │   │   ├── roles.ts     # guard por rol (player/admin/owner)
│   │   │   │   └── ratelimit.ts
│   │   │   └── config.ts
│   │   └── tests/
│   │
│   └── web/                     # Frontend React
│       ├── public/
│       │   └── themes/          # ASSETS: gráficos y sonidos intercambiables
│       │       ├── placeholder/ # tema de prueba (cuadraditos / emojis)
│       │       │   ├── symbols/ # cherry.png, bell.png, seven.png...
│       │       │   ├── bg/
│       │       │   └── sfx/     # spin.mp3, win.mp3...
│       │       └── neon-fruits/ # tema comprado (se agrega después)
│       │           ├── symbols/
│       │           ├── bg/
│       │           └── sfx/
│       ├── src/
│       │   ├── themes/
│       │   │   └── manifest.ts  # ÍNDICE: mapea "cherry" -> archivo del tema activo
│       │   ├── components/
│       │   │   ├── Reel.tsx     # un rodillo animado (NUNCA nombra archivos)
│       │   │   ├── Symbol.tsx   # pide la imagen al manifiesto por nombre lógico
│       │   │   ├── SlotMachine.tsx
│       │   │   └── Wallet.tsx
│       │   ├── admin/           # panel de admin (solo admin/owner)
│       │   │   ├── Dashboard.tsx
│       │   │   ├── SlotEditor.tsx
│       │   │   └── PlayerList.tsx
│       │   ├── hooks/
│       │   │   └── useSpin.ts   # llama al endpoint y dispara animación
│       │   └── api/client.ts
│       └── vite.config.ts
│
└── scripts/
    ├── simulate.ts              # corre N millones de giros e imprime RTP real
    └── reconcile.ts             # verifica el invariante de cuadre de créditos
```

> **Por qué `engine` es un paquete aparte:** al no depender del servidor ni de la BD, lo puedes testear con millones de giros en milisegundos, reutilizarlo en scripts de simulación y razonar sobre él de forma aislada. Es el patrón que usa la industria real.

> **Preparado para funciones especiales (sin construirlas ya):** `spin()` devuelve un `SpinResult` con forma extensible desde el día uno — un arreglo `steps[]` (un solo paso en slots simples; varios en cascadas/respins) y un objeto `features` (multiplicador, giros gratis, sesión bonus). Las funciones viven en `features/` y se enchufan sin tocar el núcleo. Así un slot simple funciona hoy y uno tipo *free spins* encaja mañana sin rehacer el motor ni la tabla `spins`.

---

## Sistema de assets (temas intercambiables)

El frontend está diseñado para que cambiar el aspecto visual sea **editar un solo archivo**, no buscar nombres de imágenes por todo el código.

**Cómo funciona:**

- Los componentes nunca nombran archivos directamente. Un `<Symbol name="cherry" />` pregunta *"¿cuál es la imagen de cherry?"* al manifiesto.
- `src/themes/manifest.ts` es ese índice: mapea cada **nombre lógico** (`cherry`, `bell`, `seven`, fondo, sonidos) a un archivo dentro del tema activo.
- Cada tema es una carpeta bajo `public/themes/` con la misma estructura (`symbols/`, `bg/`, `sfx/`).

```ts
// src/themes/manifest.ts
const ACTIVE_THEME = 'placeholder';   // <-- cambiar a 'neon-fruits' y listo

export const theme = {
  base: `/themes/${ACTIVE_THEME}`,
  symbols: {
    cherry: 'symbols/cherry.png',
    bell:   'symbols/bell.png',
    seven:  'symbols/seven.png',
    // ...mismos nombres lógicos en todos los temas
  },
  sfx: { spin: 'sfx/spin.mp3', win: 'sfx/win.mp3' },
};
```

**Para enchufar assets comprados:**

1. Crear una carpeta nueva en `public/themes/` (ej. `neon-fruits/`) con la misma estructura.
2. Poner las imágenes/sonidos comprados con los nombres que espera el manifiesto.
3. Cambiar `ACTIVE_THEME` a `'neon-fruits'`. Fin.

> **Regla:** los nombres lógicos (`cherry`, `bell`...) los define el **motor** (los símbolos del slot). El tema solo decide *cómo se ven*, nunca *qué son*. Así un mismo slot puede tener infinitos "skins" sin tocar la lógica.

---

## Roles y permisos

Control de acceso por roles (RBAC). Cada usuario tiene un rol que define qué puede hacer. El principio: **cada quien accede solo a lo que le corresponde.**

| Acción                          | Jugador | Admin | Owner |
|---------------------------------|:-------:|:-----:|:-----:|
| Jugar / girar                   | ✅      | ✅    | ✅    |
| Ver su propio saldo e historial | ✅      | ✅    | ✅    |
| **Solicitar retiro de fichas**  | ✅      | —     | —     |
| **Crear cuentas de jugadores**  | ❌      | ✅ (sus jugadores) | ✅ |
| **Crear cuentas de admin**      | ❌      | ❌    | ✅    |
| **Cargarse crédito a sí mismo** | ❌      | ❌    | ❌    |
| **Cargar crédito a un jugador** | ❌      | ✅ (los suyos, de su bolsa) | ✅ |
| **Aprobar / rechazar retiros**  | ❌      | ✅ (los suyos) | ✅ |
| **Emitir crédito / fondear admins** | ❌  | ❌    | ✅    |
| Crear / editar slots            | ❌      | ✅    | ✅    |
| Ver estadísticas de la plataforma | ❌    | ✅ (las suyas) | ✅ (global) |
| Banear jugadores                | ❌      | ✅ (los suyos) | ✅ |
| Poner límites de carga a un admin | ❌    | ❌    | ✅    |
| Configuración global            | ❌      | ❌    | ✅    |

**Cómo se aplica:**

- En la **BD**, el rol vive en `users.role`; quién creó cada cuenta, en `users.created_by`.
- En la **API**, las rutas sensibles pasan por un guard que exige el rol mínimo. Si no lo cumple → `403 Forbidden`.
- Un admin solo puede actuar sobre **sus propios** jugadores (los que tienen su `id` en `created_by`). Tocar un jugador ajeno → `403`.
- En el **frontend**, el panel de administración solo se renderiza para `admin` y `owner`.

> **Seguridad:** el rol y la pertenencia se validan **siempre en el servidor**, nunca confiando en el frontend.

---

## Árbol de cuentas (cómo se crean los usuarios)

**No hay registro público.** El sistema es un árbol cerrado: cada nivel crea al de abajo. La única ruta pública es el login.

```
   OWNER  ──crea──▶  ADMIN  ──crea──▶  JUGADOR
  (raíz, db:seed)
```

| Rol     | Quién lo crea | Cómo |
|---------|---------------|------|
| Owner   | Script de setup | `db:seed` (o promoción manual en BD). Es la raíz; `created_by = NULL`. |
| Admin   | El owner      | `POST /owner/admins` con usuario + contraseña temporal |
| Jugador | Su admin      | `POST /admin/players` con usuario + contraseña temporal |

**Reglas:**

- Cada cuenta guarda en `created_by` quién la creó → define a quién "pertenece".
- Quien crea una cuenta le asigna una **contraseña temporal**; el nuevo usuario debe **cambiarla en su primer login** (`must_change_password = true`). Así el creador no conserva la contraseña ajena.
- Un admin solo ve y gestiona a los jugadores que él creó. El owner ve todo el árbol.

> El primer `owner` se crea con `db:seed` (o promoviendo un usuario en la BD), porque alguien tiene que existir en la cima antes de que haya cadena.

---

## Distribución de crédito

El crédito baja por una **cadena de niveles** y se conserva en cada paso. Nadie crea crédito de la nada salvo el owner.

```
   OWNER  ──fondea──▶  ADMIN  ──carga──▶  JUGADOR  ──apuesta──▶  (juego)
 (emite)            (su bolsa)         (su saldo)
```

**Reglas (todas validadas en el servidor):**

1. **El jugador nunca se carga crédito a sí mismo.** No existe ninguna ruta para ello.
2. **El admin solo reparte de su propia bolsa** (`wallets.balance` del admin). Cargar X a un jugador *resta X de la bolsa del admin* y *suma X al jugador*, en una sola transacción atómica. Si su bolsa no alcanza → rechazo.
3. **El owner regula el grifo.** Decide cuánto crédito entrega a cada admin (`owner_to_admin`) y, opcionalmente, le pone topes por carga (`max_load_per_tx`) y por día (`max_load_per_day`).
4. **Doble candado:** aunque el admin tenga bolsa, no puede superar los límites que le fijó el owner.
5. **Todo movimiento queda registrado** en `credit_transactions`: quién, a quién, cuánto y cuándo.

**Por qué es seguro:** el sistema se autorregula. Un admin físicamente no puede repartir más de lo que el owner le entregó, así que "cargar lo que quiera" es imposible. El owner controla el total abriendo o cerrando la bolsa de cada admin.

```jsonc
// Admin carga crédito a un jugador — POST /admin/players/:id/credit
// body: { "amount": 5000, "note": "recarga" }
// El servidor verifica EN ESTE ORDEN, todo en una TX atómica:
//   1) ¿el solicitante es admin/owner?            -> si no, 403
//   2) ¿amount <= max_load_per_tx del admin?       -> si no, 400
//   3) ¿la carga del día no supera max_load_per_day?-> si no, 400
//   4) ¿el admin tiene bolsa suficiente?            -> si no, 400 "bolsa insuficiente"
//   5) restar de admin, sumar a jugador, registrar en credit_transactions
```

> ⚠️ Créditos virtuales con fines educativos. Esta misma mecánica en un sistema con dinero real estaría sujeta a regulación de juego y licencias.

### Retiro de fichas (las fichas salen del sistema)

Cuando se aprueba un retiro, las fichas **se descuentan del jugador y salen del sistema** — no vuelven a la bolsa del admin. El admin solo *aprueba*; no recibe nada. Puede ser parcial o total.

```
   JUGADOR  ──pide retirar──▶  [PENDIENTE]  ──admin aprueba──▶  se descuenta al jugador
                                                                 (las fichas salen del sistema)
```

1. El jugador crea una solicitud de retiro por un monto (puede ser "todo" = su saldo completo, o una parte). Queda en estado `pending`.
2. Un admin la revisa y la **aprueba** o **rechaza**. El admin no recibe las fichas; solo autoriza.
3. Al aprobar, en una sola TX atómica: se restan las fichas del jugador y se registra el egreso en `credit_transactions` (`player_withdrawal`, sin destinatario → salen del sistema).
4. El registro del retiro (quién, cuánto, quién lo aprobó, cuándo) queda en `withdrawals`.

> **Por qué no vuelve al admin:** la bolsa del admin es crédito *disponible para repartir*. Si las fichas retiradas volvieran ahí, podría repartirlas de nuevo, inflando el crédito. Las fichas retiradas ya fueron "cobradas" (el valor real se entrega fuera del sistema), así que deben salir de circulación. Lo que entra lo emite el owner; lo que sale es el retiro.

> El dinero real (si existiera) se liquida **fuera del sistema**; aquí solo se descuentan y auditan fichas virtuales. El software lleva la cuenta, no procesa pagos.

### Historial de premios

No hace falta una tabla aparte: **la tabla `spins` ya es el registro de premios.** Cada giro guarda cuándo (`created_at`), cuánto (`payout`), dónde (`slot_id`), por qué (`win_lines` + `multiplier`) y qué salió (`result`). Los premios son simplemente los giros con `payout > 0` (hay un índice dedicado para consultarlos rápido).

---

## Modelo de datos

```sql
-- Usuarios
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'player',  -- 'player' | 'admin' | 'owner'
  status      TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'banned'
  created_by  UUID REFERENCES users(id),       -- quién creó esta cuenta (jerarquía/árbol). NULL = owner raíz
  must_change_password BOOLEAN NOT NULL DEFAULT true,  -- forzar cambio en el primer login
  -- Límites que el OWNER impone a un admin (NULL = sin tope extra). Solo aplican a admins.
  max_load_per_tx  BIGINT,                     -- tope por carga individual
  max_load_per_day BIGINT,                     -- tope acumulado por día
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_parent ON users(created_by);  -- "los jugadores de tal admin"

-- Wallet de créditos (1 por usuario).
-- Jugador: su saldo de juego. Admin: su "bolsa" para repartir. Owner: el pozo maestro.
CREATE TABLE wallets (
  user_id     UUID PRIMARY KEY REFERENCES users(id),
  balance     BIGINT NOT NULL DEFAULT 0,       -- créditos en enteros (sin decimales)
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Movimientos de crédito entre usuarios (auditoría completa — nada aparece/desaparece sin rastro)
CREATE TABLE credit_transactions (
  id          BIGSERIAL PRIMARY KEY,
  from_user   UUID REFERENCES users(id),       -- quién entrega; NULL = el owner lo emite (entra al sistema)
  to_user     UUID REFERENCES users(id),        -- quién recibe; NULL = retiro (sale del sistema)
  amount      BIGINT NOT NULL CHECK (amount > 0),
  type        TEXT NOT NULL,                   -- 'owner_mint' | 'owner_to_admin' | 'admin_to_player' | 'player_withdrawal' (sale)
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_to ON credit_transactions(to_user, created_at DESC);
CREATE INDEX idx_credit_from ON credit_transactions(from_user, created_at DESC);

-- Configuración de cada slot
CREATE TABLE slots (
  id          TEXT PRIMARY KEY,               -- 'classic', 'fruits'...
  name        TEXT NOT NULL,
  reels       JSONB NOT NULL,                 -- tiras de cada rodillo
  paytable    JSONB NOT NULL,                 -- multiplicadores por combinación
  target_rtp  NUMERIC(5,2) NOT NULL,          -- ej: 96.00 (%)
  min_bet     BIGINT NOT NULL DEFAULT 1,      -- apuesta mínima permitida
  max_bet     BIGINT NOT NULL DEFAULT 100000, -- apuesta máxima permitida
  features    JSONB NOT NULL DEFAULT '{}',    -- config de func. especiales (free spins, cascadas, wilds...) — vacío en slots simples
  enabled     BOOLEAN NOT NULL DEFAULT true   -- habilitar/deshabilitar sin borrar
);

-- Historial de giros (auditoría + provably fair) — TAMBIÉN es el registro de premios
CREATE TABLE spins (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id),   -- quién jugó
  slot_id         TEXT NOT NULL REFERENCES slots(id),   -- DÓNDE (en qué juego)
  bet             BIGINT NOT NULL,
  payout          BIGINT NOT NULL,                      -- CUÁNTO ganó total (0 si no ganó)
  win_lines       JSONB NOT NULL DEFAULT '[]',          -- POR QUÉ ganó: combos/líneas que pagaron
  multiplier      INT NOT NULL DEFAULT 1,               -- multiplicador aplicado
  steps           JSONB NOT NULL DEFAULT '[]',          -- secuencia (cascadas/respins); 1 paso en slots simples
  session_id      UUID REFERENCES game_sessions(id),    -- a qué ronda bonus pertenece (NULL = giro normal)
  balance_after   BIGINT NOT NULL,
  server_seed     TEXT NOT NULL,              -- revelado tras el giro
  server_seed_hash TEXT NOT NULL,             -- comprometido ANTES del giro
  client_seed     TEXT NOT NULL,
  nonce           BIGINT NOT NULL,
  result          JSONB NOT NULL,             -- símbolos finales (el QUÉ salió)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()    -- CUÁNDO
);

CREATE INDEX idx_spins_user ON spins(user_id, created_at DESC);
CREATE INDEX idx_spins_wins ON spins(user_id, created_at DESC) WHERE payout > 0;  -- solo premios

-- Sesiones de funciones especiales (free spins, bonus). Mantienen estado ENTRE giros.
-- Slots simples no la usan; existe para que las funciones futuras encajen sin rehacer.
CREATE TABLE game_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  slot_id       TEXT NOT NULL REFERENCES slots(id),
  kind          TEXT NOT NULL,                    -- 'free_spins' | 'bonus' ...
  state         JSONB NOT NULL,                   -- giros restantes, multiplicador acumulado, etc.
  status        TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'finished'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_active ON game_sessions(user_id, slot_id) WHERE status = 'active';

-- Solicitudes de retiro (el jugador devuelve fichas; salen del sistema al aprobarse)
CREATE TABLE withdrawals (
  id            BIGSERIAL PRIMARY KEY,
  player_id     UUID NOT NULL REFERENCES users(id),
  amount        BIGINT NOT NULL CHECK (amount > 0),
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  resolved_by   UUID REFERENCES users(id),        -- admin que aprobó/rechazó
  reason        TEXT,                             -- motivo si se rechaza
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX idx_withdrawals_status ON withdrawals(status, created_at);

-- Registro de acciones sensibles (no-dinero): bans, cambios de límite, creación de cuentas, etc.
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID NOT NULL REFERENCES users(id),   -- quién hizo la acción
  action      TEXT NOT NULL,                        -- 'create_player' | 'ban_user' | 'set_limits' | 'approve_withdrawal' ...
  target_id   UUID REFERENCES users(id),            -- sobre quién/qué
  details     JSONB,                                -- contexto (valores antes/después)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id, created_at DESC);

-- Idempotencia: evita ejecutar dos veces el mismo pedido (doble clic, reintento de red)
CREATE TABLE idempotency_keys (
  key         TEXT PRIMARY KEY,                     -- la envía el cliente (header Idempotency-Key)
  user_id     UUID NOT NULL REFERENCES users(id),
  endpoint    TEXT NOT NULL,
  response    JSONB NOT NULL,                       -- resultado guardado para devolver igual si se repite
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

> **Nota:** los saldos se guardan como **enteros** (`BIGINT`), no como floats. Nunca uses `FLOAT` para dinero o créditos — los errores de redondeo se acumulan. 1 crédito = 1 unidad entera; si necesitas "centavos", multiplica todo por 100.

---

## API

Todas las rutas (salvo auth) requieren header `Authorization: Bearer <token>`. Las rutas bajo `/admin/*` exigen rol `admin` u `owner`; las de `/owner/*`, rol `owner`.

### Rutas públicas (auth)

> No hay registro público. Las cuentas las crea el nivel superior (ver Árbol de cuentas).

### `POST /auth/login`
```jsonc
{ "username": "jugador1", "password": "..." }
// 200
{ "token": "eyJ...", "role": "player", "mustChangePassword": false, "balance": 980 }
// si es el primer login -> "mustChangePassword": true (el cliente obliga a cambiarla)
```

### `POST /auth/change-password`
Obligatoria en el primer login. Requiere token.
```jsonc
{ "currentPassword": "temporal123", "newPassword": "..." }
// 200 -> { "ok": true }   // deja must_change_password = false
```

### Rutas de jugador

### `GET /wallet`
```jsonc
// 200
{ "balance": 980 }
```

### `POST /slots/:id/spin`
```jsonc
// headers
//   Authorization: Bearer <token>
//   Idempotency-Key: <uuid único por giro>   // evita cobrar dos veces ante doble clic/reintento
// body
{ "bet": 100, "clientSeed": "opcional-del-jugador" }

// 200  — incluye TODO lo que el HUD necesita mostrar
{
  "spinId": 4821,
  "result": [["cherry","heart"], ["moon","gem"], ...],  // símbolos finales por rodillo
  "steps": [ /* secuencia de cascadas/respins; 1 paso en slots simples */ ],
  "payout": 25,                  // ganancia total de ESTE giro
  "bet": 100,                    // apuesta usada (eco para el HUD)
  "balance": 99925,              // crédito ACTUALIZADO tras el giro
  "currency": "ARS",             // moneda para formatear en pantalla
  "features": {                  // estado de funciones especiales (depende del slot)
    "multiplier": 1,
    "freeSpinsLeft": 0,
    "sessionId": null            // != null si hay una ronda bonus en curso
  },
  "serverSeedHash": "a3f8...",   // commit (la semilla se revela después)
  "nonce": 42
}

// 400 -> { "error": "Saldo insuficiente" }
// 400 -> { "error": "Apuesta fuera de rango" }   // < min_bet o > max_bet del slot
// 409 -> respuesta original repetida si llega la misma Idempotency-Key
```

> El servidor valida la apuesta contra `min_bet`/`max_bet` del slot ANTES de cobrar. Si llega una `Idempotency-Key` ya vista, devuelve el resultado guardado sin volver a girar ni cobrar.

> **Nota de formato:** los créditos se guardan y viajan como **enteros** (`99925`). El símbolo de moneda y los decimales (`99.925,00 ARS`) son trabajo del **frontend** al mostrar — nunca se guardan formateados.

### `GET /fairness/:spinId`
Devuelve los datos para que el jugador verifique el giro por su cuenta.
```jsonc
{
  "serverSeed": "f1e2...",        // revelado
  "serverSeedHash": "a3f8...",    // demuestra que no se cambió
  "clientSeed": "...",
  "nonce": 42,
  "result": ["🍒", "🍒", "🍒"]
}
```

### `GET /history`
Historial propio del jugador. `?wins=true` devuelve solo los premios.
```jsonc
// 200
{
  "spins": [
    {
      "spinId": 4821, "slot": "classic", "bet": 100,
      "payout": 25, "winLines": [{ "line": 1, "symbol": "cherry", "x": 3 }],
      "multiplier": 1, "balanceAfter": 99925, "at": "2026-05-29T23:23:00Z"
    }
  ]
}
```

### `POST /withdrawals`
El jugador solicita retirar fichas (queda `pending`). `amount: "all"` retira todo el saldo.
```jsonc
// body
{ "amount": "all" }   // o un número: { "amount": 5000 }
// 201
{ "withdrawalId": 12, "amount": 99925, "status": "pending" }
```

### `GET /withdrawals`
Lista las solicitudes propias del jugador con su estado.

### Rutas de admin (`admin` u `owner`)

```
POST   /admin/players          # CREAR cuenta de jugador (username + contraseña temporal) -> created_by = admin
GET    /admin/players          # listar SUS jugadores (los que él creó)
PATCH  /admin/players/:id      # banear / reactivar (solo los suyos)
POST   /admin/players/:id/credit  # cargar crédito a un jugador suyo (sale de la bolsa del admin)
GET    /admin/withdrawals      # solicitudes de retiro de SUS jugadores
PATCH  /admin/withdrawals/:id  # aprobar / rechazar un retiro (al aprobar: descuenta al jugador, las fichas salen del sistema)
POST   /admin/slots            # crear un slot (rodillos + paytable + RTP)
PUT    /admin/slots/:id        # editar un slot
GET    /admin/stats            # estadísticas de SUS jugadores
GET    /admin/wallet           # ver su propia bolsa y límites
GET    /admin/transactions     # sus movimientos de crédito
```

### Rutas de owner (solo `owner`)

```
POST   /owner/admins                # CREAR cuenta de admin (username + contraseña temporal)
PATCH  /owner/users/:id/role        # cambiar rol de un usuario
POST   /owner/admins/:id/fund       # fondear la bolsa de un admin (owner_to_admin)
PATCH  /owner/admins/:id/limits     # fijar max_load_per_tx / max_load_per_day
GET    /owner/users                 # ver el árbol completo (admins y sus jugadores)
GET    /owner/transactions          # TODOS los movimientos de crédito (auditoría global)
GET    /owner/config                # configuración global
PUT    /owner/config                # editar configuración global
```

> Al crear una cuenta, el servidor guarda `created_by` y deja `must_change_password = true`. La contraseña temporal nunca se almacena en claro; se guarda su hash, igual que cualquier contraseña.

> Toda ruta `/admin/*` y `/owner/*` pasa por el guard de rol del servidor. Un jugador que las invoque recibe `403 Forbidden`, sin importar lo que muestre o esconda el frontend.

---

## Datos de interfaz (HUD)

Lo que el jugador ve en pantalla (crédito, apuesta, ganancia…) es el **contrato de datos** entre el servidor y el frontend. El servidor es la fuente de verdad; el frontend solo formatea y dibuja. Definirlo temprano evita reescribir respuestas después.

| Elemento en pantalla        | Origen del dato                         | Quién lo decide |
|-----------------------------|-----------------------------------------|-----------------|
| Crédito / saldo             | `balance` de la respuesta de `/spin`    | Servidor        |
| Apuesta                     | El jugador la elige (controles +/−)     | Cliente, validada por servidor |
| Ganancia (último giro)      | `payout`                                | Servidor        |
| Moneda y formato            | `currency` + lógica de formato          | Cliente (formato), servidor (valor) |
| Multiplicador / func. especial | `features`                          | Servidor (depende del slot) |
| Giros gratis restantes      | `features.freeSpinsLeft`                | Servidor        |
| Botón girar, +/−, sonido    | —                                       | Cliente (puro frontend) |

**Reglas:**

- **Los valores siempre vienen del servidor.** El frontend nunca calcula saldo ni ganancia; solo muestra lo que recibe.
- **Almacenamiento en enteros, formato al mostrar.** Se guarda `99925`; se muestra `99.925,00 ARS`. El formato (separadores, decimales, símbolo) es 100% del frontend.
- **El HUD se adapta al slot.** Un slot simple muestra crédito/apuesta/ganancia; uno con funciones especiales muestra además su multiplicador o contador, leyendo `features`.

> ⚠️ La imagen de referencia (Starlight Princess) es de Pragmatic Play. Úsala solo para entender *qué datos* muestra un slot; el arte, la marca y los personajes deben ser propios.

---

## Provably Fair

El jugador puede comprobar que ningún giro fue manipulado:

1. **Commit:** antes de girar, el servidor genera un `serverSeed` secreto y publica su `SHA256` (`serverSeedHash`).
2. **Giro:** el resultado se deriva de `HMAC-SHA256(serverSeed, clientSeed:nonce:reelIndex)`. El `clientSeed` lo puede aportar el jugador.
3. **Reveal:** tras el giro, el servidor entrega el `serverSeed`. El jugador verifica que `SHA256(serverSeed) == serverSeedHash` y recalcula el resultado por su cuenta.

Como el `serverSeedHash` se publicó *antes* de conocer el resultado, el servidor no pudo elegir un seed favorable a la casa después del hecho.

---

## Integridad y auditoría

Tres mecanismos para que nada se rompa en silencio:

**1. Idempotencia (no cobrar dos veces).**
Las operaciones que mueven crédito —girar, cargar, aprobar retiro— aceptan un header `Idempotency-Key`. El servidor guarda la clave y su resultado en `idempotency_keys`. Si llega la misma clave otra vez (doble clic, reintento de red), devuelve el resultado guardado **sin volver a ejecutar**. Así un giro nunca se cobra dos veces.

**2. Regla de cuadre (reconciliación).**
El sistema mantiene un invariante que siempre debe cumplirse:

```
   Σ (todo lo que el owner emitió)  ==  Σ (saldos de todas las billeteras)  +  Σ (retiros aprobados)
```

Es decir: el crédito ni se crea ni se destruye salvo al emitir (owner) o al retirar (jugador). Hay un script (`npm run reconcile`) que lo verifica; si algún día no cuadra, hay un bug y se detecta enseguida en vez de descubrirlo tarde.

**3. Registro de acciones (audit log).**
Toda acción sensible que **no** sea dinero queda en `audit_log`: crear una cuenta, banear a alguien, cambiar límites, aprobar/rechazar un retiro. Guarda quién, qué, sobre quién y cuándo. El dinero ya está auditado en `credit_transactions`; esto cubre el resto.

> Juntos cierran el círculo: `credit_transactions` audita el dinero, `audit_log` audita las acciones, la reconciliación verifica que los números cierran, y la idempotencia evita duplicados. Nada cambia sin dejar rastro.

---

## Puesta en marcha

```bash
# 1. Clonar e instalar
git clone https://github.com/tu-usuario/luckyspin.git
cd luckyspin
npm install

# 2. Levantar Postgres + Redis con Docker
cp .env.example .env
docker compose up -d

# 3. Migraciones + datos semilla (crea el OWNER raíz y los slots por defecto)
npm run db:migrate
npm run db:seed

# 4. Arrancar API y frontend
npm run dev          # levanta api (:3000) y web (:5173)

# 5. (opcional) Simular RTP
npm run simulate -- --slot classic --spins 5000000

# 6. (opcional) Verificar que los créditos cuadran
npm run reconcile
```

---

## Variables de entorno

```bash
# .env.example
DATABASE_URL=postgres://luckyspin:dev@localhost:5432/luckyspin
REDIS_URL=redis://localhost:6379
JWT_SECRET=cambia-esto-por-algo-largo-y-aleatorio
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
PORT=3000
OWNER_USERNAME=owner       # cuenta owner inicial que crea db:seed
OWNER_PASSWORD=cambiar-en-primer-login
```

---

## Cálculo de RTP

El **RTP (Return To Player)** no es un número que "se configura": *emerge* de la composición de los rodillos y la tabla de pagos. El script `simulate.ts` lo verifica empíricamente:

```
$ npm run simulate -- --slot classic --spins 5000000

  Slot:        classic
  Giros:       5,000,000
  Apostado:    50,000,000 créditos
  Pagado:      48,012,350 créditos
  ─────────────────────────────
  RTP real:    96.02 %   (objetivo: 96.00 %)   ✅
  Hit rate:    23.1 %    (giros con premio)
  Volatilidad: media
```

El test `rtp.test.ts` falla si el RTP simulado se aleja del objetivo más de un margen aceptable — así detectas si tocaste mal un rodillo o un pago.

---

## Roadmap

- [x] Motor puro con RNG provably fair
- [x] Cálculo y verificación de RTP
- [x] API: auth (login + cambio de contraseña) + spin + wallet con TX atómica
- [x] Roles y permisos (player / admin / owner) con guard server-side
- [x] Árbol de cuentas: owner crea admins, admin crea sus jugadores (sin registro público)
- [x] Distribución de crédito por niveles (owner→admin→jugador) con auditoría
- [x] Historial de premios consultable por el jugador
- [x] Retiro de fichas con aprobación (se descuenta al jugador; las fichas salen del sistema)
- [x] Persistencia e historial de giros
- [x] Apuesta mín/máx por slot (validada en el servidor)
- [x] Integridad: idempotencia, regla de cuadre y audit log
- [x] Frontend con rodillos animados
- [x] Panel de admin: crear/editar slots, ver stats, gestionar jugadores
- [x] Líneas de pago múltiples (más de 3 carretes / paylines)
- [x] Funciones especiales (*wild*, *scatter*, *free spins*) — slot Wild Bonanza
- [x] WebSockets para giros en tiempo real (live feed de premios)
- [x] Jackpot progresivo por slot (trigger: 3× SEVEN incluso con wilds)
- [ ] Cascadas / avalanche (slots con respins encadenados)
- [ ] Jackpot compartido entre múltiples instancias (Redis pub/sub)

---

## Decisiones de diseño

- **Lógica server-side, siempre.** Es la regla número uno. El cliente es "tonto".
- **Saldos en enteros.** Nunca floats para créditos.
- **Motor desacoplado del servidor.** Permite simulación masiva y tests rápidos.
- **Transacciones atómicas con `SELECT ... FOR UPDATE`.** Previene corrupción de saldo bajo concurrencia.
- **Provably fair desde el día uno.** Aunque sean créditos virtuales, enseña el patrón real de la industria.
- **Assets desacoplados por temas.** Los gráficos/sonidos se cambian editando un manifiesto; la lógica nunca nombra archivos. Permite pasar de gráficos de prueba a assets comprados sin tocar el código.
- **Permisos validados en el servidor.** Los roles (player/admin/owner) se verifican en la API, nunca confiando en lo que muestre el frontend.
- **Crédito por cadena conservativa.** El crédito baja owner→admin→jugador; cada uno solo reparte de su propia bolsa. El sistema se autorregula y todo movimiento queda auditado.
- **Resultado del motor extensible.** `spin()` devuelve `steps[]` + `features` desde el día uno, para que las funciones especiales encajen sin rehacer el motor ni la BD.
- **Idempotencia en operaciones de crédito.** Un mismo pedido no se ejecuta dos veces, aunque se repita por doble clic o reintento.
- **Cuadre verificable.** Invariante de reconciliación + audit log: el dinero y las acciones siempre cierran y dejan rastro.
- **Créditos virtuales, sin pasarela de pago.** Fuera del alcance de regulación de juego con dinero real.

> ⚠️ **Aviso:** este proyecto usa exclusivamente créditos virtuales con fines educativos y de portfolio. Operar juegos de azar con dinero real está fuertemente regulado y requiere licencias específicas según la jurisdicción.

---

## Licencia

MIT © MAC87
