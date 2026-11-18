# PostgreSQL ledger schema experiment
Scope MOD-20: candidate SAD evidence, not approved production migration.
Acceptance: positive integer settlement, unique command per outlet, unique sequence per outlet and epoch, foreign key outlet membership, force RLS with transaction-local outlet scope, default deny absent scope, no update/delete permissions to runtime role. Test on PostgreSQL using non-owner role. No claims of exclusive writer fencing, authenticated scope binding, recovery or full payment service. Runtime scope must ultimately be derived from authorization rather than client input.
