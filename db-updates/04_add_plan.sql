-- 04_add_plan.sql
-- Añade la columna 'plan' para registrar la frecuencia de cobro elegida:
--   'legacy_monthly' -> socios antiguos con precio bloqueado en $2.990/mes
--   'monthly'        -> Mensual  ($3.990/mes)
--   'semester'       -> Semestral ($3.490/mes, se cobra $20.940 cada 6 meses)
--   'annual'         -> Anual     ($2.990/mes, se cobra $35.880 cada 12 meses)
--
-- IMPORTANTE: ejecuta esto ANTES (o al mismo tiempo) de publicar el código nuevo,
-- y de una sola vez. Los socios que ya existen mantienen su precio de $2.990 porque
-- su suscripción en MercadoPago no cambia; aquí solo los marcamos como 'legacy_monthly'
-- para que los reportes internos sigan mostrando su precio real.

-- 1. Agregar la columna SIN default -> las filas existentes quedan en NULL.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS plan text;

-- 2. Backfill: todo socio que ya existía estaba en el plan antiguo de $2.990/mes.
--    (Los socios nuevos que inserta create-member.js siempre traen su plan explícito,
--     nunca NULL, así que esta línea solo afecta a los antiguos.)
UPDATE members
  SET plan = 'legacy_monthly'
  WHERE plan IS NULL;

-- 3. Default para inserciones futuras que no especifiquen plan.
ALTER TABLE members
  ALTER COLUMN plan SET DEFAULT 'monthly';
