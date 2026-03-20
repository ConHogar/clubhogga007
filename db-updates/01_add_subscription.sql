-- Actualización para integrar pagos (MercadoPago)

-- Agregar columna para vincular la suscripción
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS subscription_id text;

-- Si quisieras rastrear el estado exacto del pago en crudo desde MP
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS payment_status text default 'pending';

-- Nos aseguramos que la columna 'email' esté indexada, ya que la usaremos para encontrar al usuario desde el webhook de MercadoPago
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
