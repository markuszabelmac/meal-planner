-- DropIndex
DROP INDEX "meal_plans_date_meal_type_key";

-- AlterTable
ALTER TABLE "meal_plans" ADD COLUMN     "for_user_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "family_preferences" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_preferences_key_key" ON "family_preferences"("key");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_date_meal_type_for_user_id_key" ON "meal_plans"("date", "meal_type", "for_user_id");

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_for_user_id_fkey" FOREIGN KEY ("for_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
