UPDATE "enquiries" AS enquiry
SET "lawyerId" = lawyer."id"
FROM "lawyers" AS lawyer
WHERE enquiry."lawyerId" IS NULL
  AND enquiry."assignedAdvocate" IS NOT NULL
  AND lower(trim(enquiry."assignedAdvocate")) = lower(trim(lawyer."name"));

ALTER TABLE "enquiries" DROP CONSTRAINT IF EXISTS "enquiries_lawyerId_fkey";

ALTER TABLE "enquiries"
ADD CONSTRAINT "enquiries_lawyerId_fkey"
FOREIGN KEY ("lawyerId") REFERENCES "lawyers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
