ALTER TABLE "enquiries" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "enquiries_deletedAt_entryTime_idx" ON "enquiries"("deletedAt", "entryTime");

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_enquiryId_createdAt_idx" ON "audit_logs"("enquiryId", "createdAt");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
