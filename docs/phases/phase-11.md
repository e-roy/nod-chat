**Phase 11 — ejabberd Server Setup**

**ROLE:** You are a senior DevOps engineer setting up **ejabberd + Postgres** for local/dev use with WebSocket, MAM, Stream Management, MUC, Receipts, Webhooks, and HTTP API. No mobile app changes yet.

**GOAL:** A reproducible local stack reachable at `ws://localhost:5280/xmpp-websocket` with persistence in Postgres and a basic admin.

**DO:**

1. Create `infra/xmpp/docker-compose.yml` with two services:

   - `postgres:15` (volume for data, env for user/pass/db)
   - `ejabberd` (latest community), mount `ejabberd.yml`, expose `5222` (optional), `5280` (http/websocket), link to Postgres.

2. Add `infra/xmpp/ejabberd.yml` minimal config:

   - `hosts: ["localhost"]`
   - `loglevel: 4`
   - **listen**:

     - `5280` `ejabberd_http` with `websocket`, `api`, `admin` enabled.

   - **auth**: `auth_method: sql` with Postgres DSN (from env).
   - **default DB**: `sql_type: pgsql`, enable MAM to SQL.
   - **modules** (enable and configure):

     - `mod_mam: { default: always, cache_size: 0 }`
     - `mod_stream_mgmt: { resend_on_timeout: 1 }`
     - `mod_receipts: { }`
     - `mod_carboncopy: { }`
     - `mod_muc: { default_room_options: { persistent: true, mam: true } }`
     - `mod_last: { }`
     - `mod_roster: { versioning: true }`
     - `mod_vcard: { }`
     - `mod_push: { }`
     - `mod_webhooks: { outgoing: [{ url: "http://localhost:8787/ejabberd/webhook", headers: [{"X-Webhook-Token":"dev-secret"}], events: [message, muc_message] }] }`
     - `mod_http_api: { }`

   - Disable s2s for dev: `s2s_use_starttls: optional`, or `disable_s2s: true`.

3. Create `infra/xmpp/.env.example`:

   ```
   PGUSER=ejabberd
   PGPASSWORD=ejabberd
   PGDATABASE=ejabberd
   PGHOST=postgres
   PGPORT=5432
   EJABBERD_ADMIN=admin
   EJABBERD_ADMIN_PASS=admin123
   EJABBERD_DOMAIN=localhost
   WEBHOOK_TOKEN=dev-secret
   ```

4. Add a tiny init script `infra/xmpp/init.sh` executed after up:

   - Wait for ejabberd to start.
   - Use **HTTP API** to register admin: `admin@localhost`.
   - Create two test users: `alice@localhost`, `bob@localhost`.
   - Verify by creating a direct message between them via `send_stanza` or quick CLI `ejabberdctl` if available in container.

5. Add `infra/README.md` with:

   - `docker compose up -d`
   - Admin UI at `http://localhost:5280/admin` (login as `admin@localhost`).
   - WebSocket endpoint: `ws://localhost:5280/xmpp-websocket`
   - How to tail logs / reset DB.

**FILES TO ADD/EDIT:**

- `infra/xmpp/docker-compose.yml`
- `infra/xmpp/ejabberd.yml`
- `infra/xmpp/.env.example`
- `infra/xmpp/init.sh`
- `infra/README.md`

**ACCEPTANCE:**

- `docker compose up -d` brings up Postgres + ejabberd with no errors.
- Can log into **Admin** at `http://localhost:5280/admin` as `admin@localhost`.
- Using any desktop XMPP client (e.g., Gajim) with `alice@localhost` / `bob@localhost`, messages send, **MAM** stores history, **receipts** arrive.
- WebSocket endpoint responds at `ws://localhost:5280/xmpp-websocket`.

**SELF-CHECKS:**

- MAM writes to Postgres (confirm tables populated).
- Disconnect/reconnect preserves session via **Stream Management** (no message loss).
- Webhooks fire to the configured URL (even if 404 for now).
