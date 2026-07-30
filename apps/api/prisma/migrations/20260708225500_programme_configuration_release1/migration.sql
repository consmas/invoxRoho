-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('REVERSE_FACTORING', 'DISTRIBUTOR_FINANCE', 'DEEP_TIER_FINANCE', 'RECEIVABLES_PURCHASE');

-- CreateEnum
CREATE TYPE "ProgrammeMode" AS ENUM ('LIVE', 'SANDBOX');

-- CreateEnum
CREATE TYPE "DayCountConvention" AS ENUM ('ACT_360', 'ACT_365', 'THIRTY_360');

-- CreateEnum
CREATE TYPE "DiscountMethod" AS ENUM ('STRAIGHT_DISCOUNT', 'TRUE_DISCOUNT');

-- AlterTable
ALTER TABLE "Programme"
ADD COLUMN "productType" "ProductType" NOT NULL DEFAULT 'REVERSE_FACTORING',
ADD COLUMN "mode" "ProgrammeMode" NOT NULL DEFAULT 'LIVE',
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "effectiveFrom" TIMESTAMP(3),
ADD COLUMN "effectiveTo" TIMESTAMP(3),
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "eligibilityCounterpartyStatus" "OnboardingStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "minimumInvoiceAgeDays" INTEGER,
ADD COLUMN "maximumInvoiceAgeDays" INTEGER,
ADD COLUMN "excludedCounterpartyIds" JSONB,
ADD COLUMN "programmeLimit" DECIMAL(65,30),
ADD COLUMN "anchorLimit" DECIMAL(65,30),
ADD COLUMN "supplierLimit" DECIMAL(65,30),
ADD COLUMN "funderLimit" DECIMAL(65,30),
ADD COLUMN "concentrationCapPercent" DECIMAL(65,30),
ADD COLUMN "referenceRateSource" TEXT,
ADD COLUMN "referenceRate" DECIMAL(65,30),
ADD COLUMN "funderSpread" DECIMAL(65,30),
ADD COLUMN "dayCountConvention" "DayCountConvention" NOT NULL DEFAULT 'ACT_360',
ADD COLUMN "discountMethod" "DiscountMethod" NOT NULL DEFAULT 'STRAIGHT_DISCOUNT',
ADD COLUMN "arrangementFeeFlat" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "servicingFeePercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "approvalWorkflow" JSONB,
ADD COLUMN "requiredDocuments" JSONB,
ADD COLUMN "eSignRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "workflowSlaHours" INTEGER,
ADD COLUMN "eligibilityRules" JSONB,
ADD COLUMN "limitRules" JSONB,
ADD COLUMN "pricingRules" JSONB,
ADD COLUMN "sandboxAssumptions" JSONB,
ADD COLUMN "whiteLabelName" TEXT,
ADD COLUMN "brandPrimaryColor" TEXT,
ADD COLUMN "brandLogoUrl" TEXT,
ADD COLUMN "termsUrl" TEXT,
ADD COLUMN "configurationNotes" TEXT;
