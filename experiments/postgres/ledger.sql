CREATE ROLE ledger_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA ledger;
CREATE TABLE ledger.outlet (id uuid PRIMARY KEY);
CREATE TABLE ledger.outlet_login (
 login_name name PRIMARY KEY,
 outlet_id uuid NOT NULL REFERENCES ledger.outlet(id)
);
CREATE FUNCTION ledger.authorized_outlet() RETURNS uuid
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
 AS $ SELECT outlet_id FROM ledger.outlet_login WHERE login_name = session_user $;
REVOKE ALL ON FUNCTION ledger.authorized_outlet() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ledger.authorized_outlet() TO ledger_runtime;
CREATE TABLE ledger.receipt (
 outlet_id uuid NOT NULL REFERENCES ledger.outlet(id),
 command_id uuid NOT NULL,
 epoch bigint NOT NULL CHECK (epoch > 0),
 sequence bigint NOT NULL CHECK (sequence > 0),
 amount bigint NOT NULL CHECK (amount > 0),
 payload_hash bytea NOT NULL CHECK (octet_length(payload_hash)=32),
 PRIMARY KEY (outlet_id, command_id),
 UNIQUE (outlet_id, epoch, sequence)
);
ALTER TABLE ledger.receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger.receipt FORCE ROW LEVEL SECURITY;
CREATE POLICY outlet_scope ON ledger.receipt TO ledger_runtime
 USING (outlet_id = ledger.authorized_outlet())
 WITH CHECK (outlet_id = ledger.authorized_outlet());
REVOKE ALL ON SCHEMA ledger FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA ledger FROM PUBLIC;
GRANT USAGE ON SCHEMA ledger TO ledger_runtime;
GRANT SELECT, INSERT ON ledger.receipt TO ledger_runtime;
