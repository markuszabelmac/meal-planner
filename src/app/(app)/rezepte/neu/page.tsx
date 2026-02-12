import { RecipeForm } from "@/components/recipe-form";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function NewRecipePage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Rezepte", href: "/rezepte" },
          { label: "Neues Rezept" },
        ]}
      />
      <h2 className="mb-6 text-2xl font-bold">Neues Rezept</h2>
      <RecipeForm />
    </div>
  );
}
