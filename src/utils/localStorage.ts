import type { Recipe } from '../types/recipe';

const STORAGE_KEY = 'recipes:v1';

/**
 * Load recipes from localStorage
 * Returns empty array if storage is empty or invalid
 */
export function loadRecipes(): Recipe[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    
    // Check if it's an array
    if (!Array.isArray(parsed)) {
      console.warn('Invalid recipes data in localStorage, expected array');
      return [];
    }

    // Filter out malformed entries and return valid recipes
    return parsed.filter((recipe: unknown) => isValidRecipe(recipe));
  } catch (error) {
    console.error('Error loading recipes from localStorage:', error);
    return [];
  }
}

/**
 * Save recipes to localStorage
 */
export function saveRecipes(recipes: Recipe[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch (error) {
    console.error('Error saving recipes to localStorage:', error);
    throw error;
  }
}

/**
 * Validate if an object is a valid Recipe
 * Ignores malformed entries as per requirements
 */
function isValidRecipe(item: unknown): item is Recipe {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const recipe = item as Partial<Recipe>;

  return (
    typeof recipe.id === 'string' &&
    typeof recipe.title === 'string' &&
    recipe.title.length >= 3 &&
    (recipe.difficulty === 'Easy' || recipe.difficulty === 'Medium' || recipe.difficulty === 'Hard') &&
    Array.isArray(recipe.ingredients) &&
    Array.isArray(recipe.steps) &&
    recipe.ingredients.length > 0 &&
    recipe.steps.length > 0 &&
    typeof recipe.createdAt === 'string' &&
    typeof recipe.updatedAt === 'string'
  );
}

