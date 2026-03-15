-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create MealType enum
CREATE TYPE "MealType" AS ENUM ('fruehstueck', 'mittag', 'abend', 'snacks');

-- Create Unit enum
CREATE TYPE "Unit" AS ENUM ('g', 'kg', 'ml', 'l', 'stueck', 'el', 'tl', 'prise');

-- Create Ingredient table
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "fdc_id" INTEGER,
    "kcal_per_100g" DOUBLE PRECISION NOT NULL,
    "protein_per_100g" DOUBLE PRECISION,
    "fat_per_100g" DOUBLE PRECISION,
    "sat_fat_per_100g" DOUBLE PRECISION,
    "carbs_per_100g" DOUBLE PRECISION,
    "sugar_per_100g" DOUBLE PRECISION,
    "fiber_per_100g" DOUBLE PRECISION,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- Create unique index on fdc_id
CREATE UNIQUE INDEX "ingredients_fdc_id_key" ON "ingredients"("fdc_id");

-- Create GIN indexes for fuzzy search on ingredient names
CREATE INDEX ingredients_name_trgm_idx ON "ingredients" USING GIN ("name" gin_trgm_ops);
CREATE INDEX ingredients_name_en_trgm_idx ON "ingredients" USING GIN ("name_en" gin_trgm_ops);

-- Create RecipeIngredient table
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "ingredient_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "estimated_kcal" DOUBLE PRECISION,
    "estimated_protein" DOUBLE PRECISION,
    "estimated_fat" DOUBLE PRECISION,
    "estimated_carbs" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for RecipeIngredient
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add meal_type column to meal_plans as nullable first (for data migration)
ALTER TABLE "meal_plans" ADD COLUMN "meal_type" "MealType";

-- Migrate existing rows: set all to 'abend'
UPDATE "meal_plans" SET "meal_type" = 'abend' WHERE "meal_type" IS NULL;

-- Make meal_type NOT NULL now that all rows have a value
ALTER TABLE "meal_plans" ALTER COLUMN "meal_type" SET NOT NULL;

-- Drop old unique constraint
ALTER TABLE "meal_plans" DROP CONSTRAINT "meal_plans_date_for_user_id_key";

-- Add new unique constraint including meal_type
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_date_for_user_id_meal_type_key" UNIQUE ("date", "for_user_id", "meal_type");
