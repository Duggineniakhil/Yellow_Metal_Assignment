-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('SUBMITTED');

-- CreateTable
CREATE TABLE "loan_schemes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseInterestRate" DOUBLE PRECISION NOT NULL,
    "maxLtvPercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "grossWeightGrams" DOUBLE PRECISION NOT NULL,
    "netWeightGrams" DOUBLE PRECISION NOT NULL,
    "purityKarat" INTEGER NOT NULL,
    "selectedPlanId" TEXT NOT NULL,
    "pureGoldWeightGrams" DOUBLE PRECISION NOT NULL,
    "maxEligibleLoanAmount" DOUBLE PRECISION NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_mobileNumber_createdAt_idx" ON "leads"("mobileNumber", "createdAt");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_selectedPlanId_fkey" FOREIGN KEY ("selectedPlanId") REFERENCES "loan_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
