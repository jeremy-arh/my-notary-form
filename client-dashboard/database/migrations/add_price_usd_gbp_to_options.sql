-- Migration: Add price_usd and price_gbp columns to options table
-- This allows fixing option prices directly in USD and GBP without dynamic conversion

ALTER TABLE options ADD COLUMN IF NOT EXISTS price_usd NUMERIC(10, 2);
ALTER TABLE options ADD COLUMN IF NOT EXISTS price_gbp NUMERIC(10, 2);

-- Add comments to document the columns
COMMENT ON COLUMN options.price_usd IS 'Fixed price in USD. If set, this price will be used directly for USD currency instead of converting from additional_price.';
COMMENT ON COLUMN options.price_gbp IS 'Fixed price in GBP. If set, this price will be used directly for GBP currency instead of converting from additional_price.';
