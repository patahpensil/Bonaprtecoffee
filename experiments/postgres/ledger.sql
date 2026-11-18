CREATE ROLE ledger_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA ledger;
CREATE TABLE ledger.outlet (id uuid PRIMARY KEY);
CREATE TABLE ledger.outlet_login (
 login_name name PRIMARY KEY,
 outlet_id uuid NOT NULL REFERENCES ledger.outlet(id)
);
CREATE FUNCTION ledger.authorized_outlet() RETURNS uuid
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
 AS $ledger$ SELECT outlet_id FROM ledger.outlet_login WHERE login_name = session_user $ledger$;
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

CREATE TABLE ledger.authority (
 outlet_id uuid PRIMARY KEY REFERENCES ledger.outlet(id),
 epoch bigint NOT NULL CHECK (epoch > 0)
);
CREATE FUNCTION ledger.record_receipt(p_command uuid,p_epoch bigint,p_sequence bigint,p_amount bigint,p_hash bytea)
 RETURNS ledger.receipt
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
 AS $body$
 DECLARE o uuid; active_epoch bigint; existing ledger.receipt;
 BEGIN
 o := ledger.authorized_outlet();
 IF o IS NULL THEN RAISE EXCEPTION 'Unauthorized outlet' USING ERRCODE='42501'; END IF;
 SELECT epoch INTO active_epoch FROM ledger.authority WHERE outlet_id=o FOR UPDATE;
 IF active_epoch IS NULL OR p_epoch IS DISTINCT FROM active_epoch THEN
 RAISE EXCEPTION 'Stale authority' USING ERRCODE='22023'; END IF;
 SELECT * INTO existing FROM ledger.receipt WHERE outlet_id=o AND command_id=p_command;
 IF FOUND THEN
 IF ROW(existing.epoch,existing.sequence,existing.amount,existing.payload_hash) IS DISTINCT FROM ROW(p_epoch,p_sequence,p_amount,p_hash) THEN
 RAISE EXCEPTION 'Command payload mismatch' USING ERRCODE='22023'; END IF;
 RETURN existing;
 END IF;
 INSERT INTO ledger.receipt VALUES (o,p_command,p_epoch,p_sequence,p_amount,p_hash) RETURNING * INTO existing;
 RETURN existing;
 END $body$;
REVOKE ALL ON FUNCTION ledger.record_receipt(uuid,bigint,bigint,bigint,bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ledger.record_receipt(uuid,bigint,bigint,bigint,bytea) TO ledger_runtime;
REVOKE INSERT ON ledger.receipt FROM ledger_runtime;
