#!/usr/bin/env bash
set -euo pipefail
dir=$(mktemp -d)
trap 'if [[ -f "$dir/pid" ]]; then kill "$(cat "$dir/pid")" || true; fi; rm -rf "$dir"' EXIT
cat > "$dir/users" <<'EOF'
"ledger_a" "test-only-a"
"ledger_b" "test-only-b"
EOF
cat > "$dir/config" <<EOF
[databases]
postgres = host=127.0.0.1 port=5432 dbname=postgres
[pgbouncer]
listen_addr=127.0.0.1
listen_port=6432
auth_type=plain
auth_file=$dir/users
pool_mode=transaction
default_pool_size=1
pidfile=$dir/pid
logfile=$dir/log
unix_socket_dir=$dir
EOF
pgbouncer -d "$dir/config"
query() {
  local user=$1 password=$2 statement=$3
  PGHOST=127.0.0.1 PGPORT=6432 PGUSER="$user" PGPASSWORD="$password" psql -X -Atq -v ON_ERROR_STOP=1 -c "$statement"
}
a=$(query ledger_a test-only-a "BEGIN; SET LOCAL app.outlet_id='00000000-0000-0000-0000-000000000002'; SELECT pg_backend_pid(),ledger.authorized_outlet(); COMMIT;")
b=$(query ledger_b test-only-b "SELECT pg_backend_pid(),ledger.authorized_outlet()")
a2=$(query ledger_a test-only-a "SELECT pg_backend_pid(),ledger.authorized_outlet()")
test "$a" = "$a2"
test "${a#*|}" = "00000000-0000-0000-0000-000000000001"
test "${b#*|}" = "00000000-0000-0000-0000-000000000002"
test "${a%%|*}" != "${b%%|*}"
test "$(query ledger_b test-only-b "SELECT count(*) FROM ledger.receipt WHERE outlet_id='00000000-0000-0000-0000-000000000001'")" = 0
echo 'ADV-10 transaction pooling PASS'
