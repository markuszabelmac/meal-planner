import { IngredientForm } from "@/components/ingredient-form";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function NeueZutatPage() {
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Zutaten", href: "/zutaten" },
          { label: "Neue Zutat" },
        ]}
      />
      <h2 className="mb-6 text-2xl font-bold">Neue Zutat</h2>
      <IngredientForm />
    </div>
  );
}
