-- Base de datos migrations: 03_add_region_comuna.sql
-- Ejecuta este archivo en la consola SQL de Supabase para añadir las columnas

ALTER TABLE members 
  ADD COLUMN region text,
  ADD COLUMN comuna text;
