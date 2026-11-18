\set ON_ERROR_STOP on
INSERT INTO ledger.outlet VALUES ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
CREATE ROLE ledger_a LOGIN PASSWORD 'test-only-a' IN ROLE ledger_runtime;
CREATE ROLE ledger_b LOGIN PASSWORD 'test-only-b' IN ROLE ledger_runtime;
CREATE ROLE ledger_unmapped LOGIN PASSWORD 'test-only-u' IN ROLE ledger_runtime;
INSERT INTO ledger.outlet_login VALUES ('ledger_a','00000000-0000-0000-0000-000000000001'), ('ledger_b','00000000-0000-0000-0000-000000000002');
INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011',1,1,100,decode(repeat('ab',32),'hex'));
\setenv PGPASSWORD test-only-u
\connect postgres ledger_unmapped
DO $$ BEGIN
 IF (SELECT count(*) FROM ledger.receipt) <> 0 THEN RAISE EXCEPTION 'Unmapped scope leaked rows'; END IF;
 BEGIN
 INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012',1,2,100,decode(repeat('ab',32),'hex'));
 RAISE EXCEPTION 'Unmapped write accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
\setenv PGPASSWORD test-only-a
\connect postgres ledger_a
BEGIN;
DO $$ BEGIN
 IF (SELECT count(*) FROM ledger.receipt) <> 1 THEN RAISE EXCEPTION 'Own receipt unavailable'; END IF;
 BEGIN
 INSERT INTO ledger.receipt SELECT * FROM ledger.receipt;
 RAISE EXCEPTION 'Duplicate accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
 INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012',1,1,100,decode(repeat('ab',32),'hex'));
 RAISE EXCEPTION 'Sequence duplicate accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 FOR i IN 1..5 LOOP
 BEGIN
 INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012',CASE WHEN i=3 THEN 0 ELSE 1 END,CASE WHEN i=4 THEN 0 ELSE 2 END,CASE WHEN i=1 THEN -1 WHEN i=2 THEN 0 ELSE 100 END,decode(repeat('ab',CASE WHEN i=5 THEN 31 ELSE 32 END),'hex'));
 RAISE EXCEPTION 'Invalid boundary accepted: %', i;
 EXCEPTION WHEN check_violation THEN NULL; END;
 END LOOP;
 BEGIN
 UPDATE ledger.receipt SET amount=200;
 RAISE EXCEPTION 'Update accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
 DELETE FROM ledger.receipt;
 RAISE EXCEPTION 'Delete accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
 UPDATE ledger.outlet_login SET outlet_id='00000000-0000-0000-0000-000000000002';
 RAISE EXCEPTION 'Mapping update accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL app.outlet_id = '00000000-0000-0000-0000-000000000002';
DO $$ BEGIN
 IF ledger.authorized_outlet() <> '00000000-0000-0000-0000-000000000001'::uuid THEN RAISE EXCEPTION 'Scope forged'; END IF;
END $$;
COMMIT;
DO $$ BEGIN
 IF (SELECT count(*) FROM ledger.receipt) <> 1 THEN RAISE EXCEPTION 'Scope changed after commit'; END IF;
END $$;
\setenv PGPASSWORD test-only-b
\connect postgres ledger_b
BEGIN;
SET LOCAL app.outlet_id = '00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
 IF (SELECT count(*) FROM ledger.receipt) <> 0 THEN RAISE EXCEPTION 'Cross outlet read'; END IF;
 BEGIN
 INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012',1,2,100,decode(repeat('ab',32),'hex'));
 RAISE EXCEPTION 'Cross outlet insert';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
DO $$ BEGIN
 IF (SELECT count(*) FROM ledger.receipt) <> 0 THEN RAISE EXCEPTION 'Scope leaked after rollback'; END IF;
END $$;
\setenv PGPASSWORD test-only-password
\connect postgres postgres
DO $$ BEGIN
 BEGIN
 INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000099','00000000-0000-0000-0000-000000000012',1,2,100,decode(repeat('ab',32),'hex'));
 RAISE EXCEPTION 'Unknown outlet accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
\echo Ledger schema checks passed
