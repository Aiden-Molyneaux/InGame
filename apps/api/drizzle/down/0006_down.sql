ALTER TABLE "card_designs" DROP CONSTRAINT IF EXISTS "card_designs_derived_from_card_id_card_designs_id_fk";
ALTER TABLE "card_designs" DROP COLUMN IF EXISTS "derived_from_card_id";
