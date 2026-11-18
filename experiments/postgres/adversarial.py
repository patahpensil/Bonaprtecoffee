import os
import subprocess
import time

A = '00000000-0000-0000-0000-000000000001'
def sql(s, user='postgres', app='audit'):
    env = dict(os.environ, PGUSER=user, PGAPPNAME=app,
               PGPASSWORD='test-only-a' if user == 'ledger_a' else 'test-only-password',
               PGOPTIONS='-c statement_timeout=15000')
    return subprocess.Popen(['psql','-X','-At','-v','ON_ERROR_STOP=1','-c',s],
                            env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
def result(p, ok=True):
    out, err = p.communicate(timeout=20)
    assert (p.returncode == 0) == ok, (out,err)
    return out.strip(),err
def call(n, epoch, amount):
    return f"SELECT (ledger.record_receipt('00000000-0000-0000-0000-{n:012d}',{epoch},{n},{amount},decode(repeat('ab',32),'hex'))).amount"
def wait_lock(app):
    deadline=time.monotonic()+8
    while time.monotonic()<deadline:
        out,_=result(sql(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}' AND wait_event_type='Lock'"))
        if out=='1': return
        time.sleep(.05)
    raise AssertionError('No observed lock contention: '+app)
def holder(statement):
    env=dict(os.environ, PGAPPNAME='audit_holder',PGOPTIONS='-c statement_timeout=15000')
    p=subprocess.Popen(['psql','-X','-At','-v','ON_ERROR_STOP=1'],env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
    p.stdin.write('BEGIN;\n'+statement+';\nSELECT 987654;\n');p.stdin.flush()
    while True:
        line=p.stdout.readline()
        if not line: raise AssertionError(p.stderr.read())
        if line.strip()=='987654': return p
def release(p):
    p.stdin.write('COMMIT;\n\\q\n');p.stdin.flush()
    result(p)
h=holder(f"SELECT epoch FROM ledger.authority WHERE outlet_id='{A}' FOR UPDATE")
p=sql(call(21,1,100),'ledger_a','audit_same1')
q=sql(call(21,1,100),'ledger_a','audit_same2')
wait_lock('audit_same1');wait_lock('audit_same2');release(h)
assert result(p)[0]==result(q)[0]=='100'
assert result(sql("SELECT count(*) FROM ledger.receipt WHERE sequence=21"))[0]=='1'
print('ADV-03 deterministic identical replay PASS',flush=True)
h=holder(f"SELECT epoch FROM ledger.authority WHERE outlet_id='{A}' FOR UPDATE")
p=sql(call(22,1,100),'ledger_a','audit_conflict1')
q=sql(call(22,1,200),'ledger_a','audit_conflict2')
wait_lock('audit_conflict1');wait_lock('audit_conflict2');release(h)
results=[x.communicate(timeout=20) for x in (p,q)]
assert sorted([p.returncode==0,q.returncode==0])==[False,True]
assert any('Command payload mismatch' in err for _,err in results)
assert result(sql("SELECT count(*) FROM ledger.receipt WHERE sequence=22"))[0]=='1'
print('ADV-04 conflicting replay PASS',flush=True)
h=holder(f"UPDATE ledger.authority SET epoch=2 WHERE outlet_id='{A}'")
p=sql(call(23,1,100),'ledger_a','audit_stale')
wait_lock('audit_stale');release(h)
assert 'Stale authority' in result(p,False)[1]
assert result(sql(call(23,2,100),'ledger_a'))[0]=='100'
assert result(sql("SELECT count(*) FROM ledger.receipt WHERE sequence=23 AND epoch=1"))[0]=='0'
print('ADV-05 concurrent epoch rotation PASS',flush=True)
