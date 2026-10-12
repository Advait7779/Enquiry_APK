CREATE TABLE "integration_settings" (
    "id" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_jobs" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_jobs_status_nextAttemptAt_idx"
ON "notification_jobs"("status", "nextAttemptAt");

CREATE INDEX "notification_jobs_enquiryId_idx"
ON "notification_jobs"("enquiryId");

ALTER TABLE "notification_jobs"
ADD CONSTRAINT "notification_jobs_enquiryId_fkey"
FOREIGN KEY ("enquiryId") REFERENCES "enquiries"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
