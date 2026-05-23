-- Ampliar precisión de presupuesto: Decimal(10,2) → Decimal(15,2)
-- Máximo anterior: 99,999,999.99 COP — insuficiente para presupuestos reales
-- Máximo nuevo:  9,999,999,999,999.99 COP
ALTER TABLE "viajes"
  ALTER COLUMN "presupuesto" TYPE DECIMAL(15,2);

ALTER TABLE "itinerarios"
  ALTER COLUMN "costo_estimado" TYPE DECIMAL(15,2);
