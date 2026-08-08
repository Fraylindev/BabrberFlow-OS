-- AlterTable: Organization — campos del micro-sitio público
ALTER TABLE "Organization" ADD COLUMN "address" TEXT;
ALTER TABLE "Organization" ADD COLUMN "googleMapsUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN "aboutUs" TEXT;
ALTER TABLE "Organization" ADD COLUMN "heroImageUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN "socialLinks" JSONB;
ALTER TABLE "Organization" ADD COLUMN "businessHours" JSONB;

-- AlterTable: Professional — se reutiliza "avatar" existente, no se crea profileImageUrl
ALTER TABLE "Professional" ADD COLUMN "specialty" TEXT;
ALTER TABLE "Professional" ADD COLUMN "experienceYears" INTEGER;

-- CreateTable: GalleryImage
CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: GalleryImage -> Organization (Cascade: sin la organización, la galería no tiene sentido)
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: soporte para GET /bookings y GET /analytics/dashboard
CREATE INDEX "Booking_organizationId_status_createdAt_idx" ON "Booking"("organizationId", "status", "createdAt");

-- CreateIndex: soporte para GET /analytics/dashboard (ingresos por rango de fecha y status)
CREATE INDEX "Invoice_organizationId_status_createdAt_idx" ON "Invoice"("organizationId", "status", "createdAt");
