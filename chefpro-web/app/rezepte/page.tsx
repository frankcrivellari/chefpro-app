import { RecipeEditor } from "@/components/recipes/recipe-editor";

export default function RezeptePage() {
  return (
    <>
      <h1 style={{fontSize: '100px', color: 'purple', position: 'fixed', top: 0, left: 0, zIndex: 99999}}>TEST</h1>
      <RecipeEditor mode="recipes" />
    </>
  );
}

