"use client";

import React from "react";
import CookingCompanionDialog from "@/components/CookingCompanionDialog";

type IngredientItem = {
  id: string;
  quantity: number;
  unit_name: string | null;
  unit_short_name: string | null;
  ingredient_display_name: string;
};

type IngredientGroup = {
  name: string | null;
  items: IngredientItem[];
};

type StepRow = { id: string; step_number: number; instruction: string };

export default function CookingCompanionMount(props: {
  recipeId: string;
  recipeName: string;
  initialPortions: number;
  ingredientGroups: IngredientGroup[];
  steps: StepRow[];
  userHasRated: boolean;
}) {
  const { recipeId, recipeName, initialPortions, ingredientGroups, steps, userHasRated } = props;
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    (window as any).__openCookingCompanion = () => setOpen(true);
    return () => {
      if ((window as any).__openCookingCompanion) {
        delete (window as any).__openCookingCompanion;
      }
    };
  }, []);

  return (
    <CookingCompanionDialog
      isOpen={open}
      onClose={() => setOpen(false)}
      recipeId={recipeId}
      recipeName={recipeName}
      initialPortions={initialPortions}
      ingredientGroups={ingredientGroups}
      steps={steps}
      userHasRated={userHasRated}
    />
  );
}

