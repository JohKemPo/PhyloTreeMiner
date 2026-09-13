// Inverso da migração 0001. Idempotente: `IF EXISTS` permite rodar em uma
// base onde a migração nunca tenha sido aplicada sem erro.

DROP INDEX subtree_uid_idx IF EXISTS;

DROP INDEX tree_uid_idx IF EXISTS;

DROP CONSTRAINT user_uid_unico IF EXISTS;
