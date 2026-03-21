-- 02_add_valid_until.sql
-- Añadir columna valid_until para manejar expiración de suscripciones sin cron jobs.

ALTER TABLE members
ADD COLUMN valid_until TIMESTAMP WITH TIME ZONE;
