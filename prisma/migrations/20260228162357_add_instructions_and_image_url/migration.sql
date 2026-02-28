-- DropForeignKey
ALTER TABLE "meal_plans" DROP CONSTRAINT "meal_plans_recipe_id_fkey";

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "instructions" TEXT;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
