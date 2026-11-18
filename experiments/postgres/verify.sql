\set ON_ERROR_STOP on
INSERT INTO ledger.outlet VALUES ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
BEGIN;
SET LOCAL ROLE ledger_runtime;
DO $$ BEGIN
 IF (SELECT count(*) FROM ledger.receipt) <> 0 THEN RAISE EXCEPTION 'Missing scope leaked rows'; END IF;
 BEGIN
 INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011',1,1,100,decode(repeat('ab',32),'hex'));
 RAISE EXCEPTION 'Missing scope allowed insert';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL app.outlet_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011',1,1,100,decode(repeat('ab',32),'hex'));
DO $$ BEGIN
 BEGIN
 INSERT INTO ledger.receipt SELECT * FROM ledger.receipt;
 RAISE EXCEPTION 'Duplicate accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
 INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012',1,1,100,decode(repeat('ab',32),'hex'));
 RAISE EXCEPTION 'Sequence duplicate accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
 INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012',1,2,-1,decode(repeat('ab',32),'hex'));
 RAISE EXCEPTION 'Negative accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
 UPDATE ledger.receipt SET amount=200;
 RAISE EXCEPTION 'Update accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
 DELETE FROM ledger.receipt;
 RAISE EXCEPTION 'Delete accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL app.outlet_id = '00000000-0000-0000-0000-000000000002';
DO $$ BEGIN
 IF (SELECT count(*) FROM ledger.receipt) <> 0 THEN RAISE EXCEPTION 'Cross outlet read'; END IF;
 BEGIN
 INSERT INTO ledger.receipt VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012',1,2,100,decode(repeat('ab',32),'hex'));
 RAISE EXCEPTION 'Cross outlet insert';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
\echo Ledger schema checks passed
