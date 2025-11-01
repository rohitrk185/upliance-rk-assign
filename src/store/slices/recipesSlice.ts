import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Recipe } from '../../types/recipe';
import { loadRecipes } from '../../utils/localStorage';

interface RecipesState {
  recipes: Recipe[];
}

// Initializing state from localStorage
const initialState: RecipesState = {
  recipes: loadRecipes(),
};

const recipesSlice = createSlice({
  name: 'recipes',
  initialState,
  reducers: {
    addRecipe: (state, action: PayloadAction<Recipe>) => {
      state.recipes.push(action.payload);
    },
    updateRecipe: (state, action: PayloadAction<Recipe>) => {
      const index = state.recipes.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.recipes[index] = action.payload;
      }
    },
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const recipe = state.recipes.find((r) => r.id === action.payload);
      if (recipe) {
        recipe.isFavorite = !recipe.isFavorite;
      }
    },
    deleteRecipe: (state, action: PayloadAction<string>) => {
      state.recipes = state.recipes.filter((r) => r.id !== action.payload);
    },
  },
});

export const { addRecipe, updateRecipe, toggleFavorite, deleteRecipe } = recipesSlice.actions;
export default recipesSlice.reducer;

