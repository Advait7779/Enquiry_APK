-- Add junior lawyer accounts and link client enquiries to their assigned lawyer.
CREATE TABLE IF NOT EXISTS "lawyers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'lawyer',
    "phone" TEXT,
    "email" TEXT,
    "assignedTasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "authVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lawyers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "lawyers" ADD COLUMN IF NOT EXISTS "authVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "lawyerId" TEXT;
UPDATE "lawyers" SET "role" = 'lawyer' WHERE "role" <> 'lawyer';

-- Disable accounts created by the previous demo seed. The admin can assign new,
-- private credentials before reactivating any real lawyer represented by these rows.
UPDATE "lawyers"
SET "username" = NULL,
    "passwordHash" = NULL,
    "isActive" = false,
    "authVersion" = "authVersion" + 1,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('lawyer_omkar', 'lawyer_sharma', 'lawyer_kulkarni', 'lawyer_general');

CREATE UNIQUE INDEX IF NOT EXISTS "lawyers_name_key" ON "lawyers"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "lawyers_username_key" ON "lawyers"("username");
CREATE INDEX IF NOT EXISTS "enquiries_lawyerId_idx" ON "enquiries"("lawyerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enquiries_lawyerId_fkey'
  ) THEN
    ALTER TABLE "enquiries"
      ADD CONSTRAINT "enquiries_lawyerId_fkey"
      FOREIGN KEY ("lawyerId") REFERENCES "lawyers"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
