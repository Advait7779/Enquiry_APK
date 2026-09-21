CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "alternateNo" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "fullName" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "caseNumber" TEXT,
    "assignedAdvocate" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'Normal',
    "status" TEXT NOT NULL DEFAULT 'Waiting',
    "notes" TEXT,
    "entryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consultationStartTime" TIMESTAMP(3),
    "consultationEndTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clients_contactNo_key" ON "clients"("contactNo");
CREATE INDEX "enquiries_entryTime_idx" ON "enquiries"("entryTime");
CREATE INDEX "enquiries_contactNo_idx" ON "enquiries"("contactNo");
CREATE INDEX "enquiries_status_idx" ON "enquiries"("status");
CREATE INDEX "enquiries_status_entryTime_idx" ON "enquiries"("status", "entryTime");
CREATE INDEX "enquiries_urgency_entryTime_idx" ON "enquiries"("urgency", "entryTime");
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
