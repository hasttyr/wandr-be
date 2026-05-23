-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viajes" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "presupuesto" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias" (
    "id" TEXT NOT NULL,
    "viaje_id" TEXT NOT NULL,
    "tipo_turismo" TEXT NOT NULL,
    "transporte" TEXT NOT NULL,
    "alojamiento" TEXT NOT NULL,

    CONSTRAINT "preferencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerarios" (
    "id" TEXT NOT NULL,
    "viaje_id" TEXT NOT NULL,
    "dia" INTEGER NOT NULL,
    "hora" TEXT,
    "actividad" TEXT NOT NULL,
    "ubicacion" TEXT,
    "costo_estimado" DECIMAL(10,2),
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itinerarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "preferencias_viaje_id_key" ON "preferencias"("viaje_id");

-- CreateIndex
CREATE INDEX "itinerarios_viaje_id_dia_idx" ON "itinerarios"("viaje_id", "dia");

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias" ADD CONSTRAINT "preferencias_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerarios" ADD CONSTRAINT "itinerarios_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
