-- Migration: Add banking information to notary table
-- This migration adds IBAN, BIC, and Bank name columns to the notary table

-- Add banking information columns
ALTER TABLE public.notary
ADD COLUMN IF NOT EXISTS iban VARCHAR(34),
ADD COLUMN IF NOT EXISTS bic VARCHAR(11),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);

-- Add comments
COMMENT ON COLUMN public.notary.iban IS 'International Bank Account Number (IBAN)';
COMMENT ON COLUMN public.notary.bic IS 'Bank Identifier Code (BIC/SWIFT)';
COMMENT ON COLUMN public.notary.bank_name IS 'Name of the bank';

