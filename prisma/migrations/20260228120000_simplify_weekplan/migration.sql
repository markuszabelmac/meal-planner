-- First, delete duplicate entries keeping only one per (date, for_user_id)
DELETE FROM "meal_plans" a
USING "meal_plans" b
WHERE a.id > b.id
  AND a.date = b.date
  AND a.for_user_id = b.for_user_id;

-- Drop the old unique constraint
ALTER TABLE "meal_plans" DROP CONSTRAINT IF EXISTS "meal_plans_date_meal_type_for_user_id_key";

-- Drop the mealType column
ALTER TABLE "meal_plans" DROP COLUMN "meal_type";

-- Make recipe_id nullable
ALTER TABLE "meal_plans" ALTER COLUMN "recipe_id" DROP NOT NULL;

-- Add custom_meal column
ALTER TABLE "meal_plans" ADD COLUMN "custom_meal" TEXT;

-- Add new unique constraint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_date_for_user_id_key" UNIQUE ("date", "for_user_id");
