import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  MenuItem,
  Button,
  Paper,
  Grid,
  IconButton,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Alert,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { Difficulty, Ingredient, RecipeStep, Recipe } from '../types/recipe';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addRecipe } from '../store/slices/recipesSlice';
import { saveRecipes } from '../utils/localStorage';

function CreateRecipe() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const recipes = useAppSelector((state) => state.recipes.recipes);
  
  const [title, setTitle] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [titleError, setTitleError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Temporary state for adding new ingredient
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    quantity: '',
    unit: '',
  });

  const [steps, setSteps] = useState<RecipeStep[]>([]);
  
  // Temporary state for adding new step
  const [newStep, setNewStep] = useState({
    description: '',
    type: 'cooking' as 'cooking' | 'instruction',
    durationMinutes: '',
    // For cooking type
    temperature: '',
    speed: '',
    // For instruction type
    selectedIngredientIds: [] as string[],
  });

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (value.length > 0 && value.length < 3) {
      setTitleError('Title must be at least 3 characters');
    } else {
      setTitleError('');
    }
  };

  const handleAddIngredient = () => {
    const quantity = parseFloat(newIngredient.quantity);
    
    if (!newIngredient.name.trim()) {
      return;
    }
    if (quantity <= 0 || isNaN(quantity)) {
      return;
    }
    if (!newIngredient.unit.trim()) {
      return;
    }

    const ingredient: Ingredient = {
      id: `ingredient-${Date.now()}-${Math.random()}`,
      name: newIngredient.name.trim(),
      quantity,
      unit: newIngredient.unit.trim(),
    };

    setIngredients([...ingredients, ingredient]);
    setNewIngredient({ name: '', quantity: '', unit: '' });
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  const handleAddStep = () => {
    const durationMinutes = parseInt(newStep.durationMinutes, 10);
    
    if (!newStep.description.trim()) {
      return;
    }
    if (durationMinutes <= 0 || isNaN(durationMinutes)) {
      return;
    }

    // Type-specific validation
    if (newStep.type === 'cooking') {
      const temperature = parseInt(newStep.temperature, 10);
      const speed = parseInt(newStep.speed, 10);
      
      if (temperature < 40 || temperature > 200 || isNaN(temperature)) {
        return;
      }
      if (speed < 1 || speed > 5 || isNaN(speed)) {
        return;
      }

      const step: RecipeStep = {
        id: `step-${Date.now()}-${Math.random()}`,
        description: newStep.description.trim(),
        type: 'cooking',
        durationMinutes,
        cookingSettings: {
          temperature,
          speed,
        },
      };

      setSteps([...steps, step]);
      setNewStep({ description: '', type: 'cooking', durationMinutes: '', temperature: '', speed: '', selectedIngredientIds: [] });
    } else {
      // instruction type
      if (newStep.selectedIngredientIds.length === 0) {
        return;
      }

      const step: RecipeStep = {
        id: `step-${Date.now()}-${Math.random()}`,
        description: newStep.description.trim(),
        type: 'instruction',
        durationMinutes,
        ingredientIds: [...newStep.selectedIngredientIds],
      };

      setSteps([...steps, step]);
      setNewStep({ description: '', type: 'instruction', durationMinutes: '', temperature: '', speed: '', selectedIngredientIds: [] });
    }
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter((step) => step.id !== id));
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setSteps(newSteps);
  };

  const handleMoveStepDown = (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setSteps(newSteps);
  };

  // Calculate derived fields
  const calculateDerivedFields = () => {
    const totalTimeMinutes = steps.reduce((sum, step) => sum + step.durationMinutes, 0);
    const totalIngredients = ingredients.length;
    const base = { Easy: 1, Medium: 2, Hard: 3 };
    const complexityScore = base[difficulty] * steps.length;

    return { totalTimeMinutes, totalIngredients, complexityScore };
  };

  // Full validation
  const validateRecipe = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Title validation
    if (title.length < 3) {
      errors.push('Title must be at least 3 characters');
    }

    // Ingredients validation
    if (ingredients.length === 0) {
      errors.push('At least 1 ingredient is required');
    }

    // Steps validation
    if (steps.length === 0) {
      errors.push('At least 1 step is required');
    }

    // Step-specific validation
    steps.forEach((step, index) => {
      if (step.durationMinutes <= 0) {
        errors.push(`Step ${index + 1}: Duration must be greater than 0`);
      }

      if (step.type === 'cooking') {
        if (!step.cookingSettings) {
          errors.push(`Step ${index + 1}: Cooking steps require temperature and speed settings`);
        } else {
          if (step.cookingSettings.temperature < 40 || step.cookingSettings.temperature > 200) {
            errors.push(`Step ${index + 1}: Temperature must be between 40 and 200`);
          }
          if (step.cookingSettings.speed < 1 || step.cookingSettings.speed > 5) {
            errors.push(`Step ${index + 1}: Speed must be between 1 and 5`);
          }
        }
      } else if (step.type === 'instruction') {
        if (!step.ingredientIds || step.ingredientIds.length === 0) {
          errors.push(`Step ${index + 1}: Instruction steps require at least 1 ingredient`);
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  const handleSave = () => {
    // Clear previous errors
    setValidationErrors([]);
    setTitleError('');

    // Validate title separately for immediate feedback
    if (title.length < 3) {
      setTitleError('Title must be at least 3 characters');
    }

    // Full validation
    const validation = validateRecipe();
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    // Create recipe object
    const now = new Date().toISOString();
    const recipe: Recipe = {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      cuisine: cuisine.trim() || undefined,
      difficulty,
      ingredients: [...ingredients],
      steps: [...steps],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      // Dispatch to Redux
      dispatch(addRecipe(recipe));

      // Save to localStorage
      const updatedRecipes = [...recipes, recipe];
      saveRecipes(updatedRecipes);

      // Show success message
      setSnackbarMessage('Recipe saved successfully!');
      setSnackbarOpen(true);

      // Navigate to recipes list after a short delay
      setTimeout(() => {
        navigate('/recipes');
      }, 1500);
    } catch (error) {
      setSnackbarMessage('Error saving recipe. Please try again.');
      setSnackbarOpen(true);
      console.error('Error saving recipe:', error);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4, pb: 2 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/recipes')}
            sx={{ mb: 2 }}
          >
            Back to Recipes
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Create Recipe
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Build your recipe with ingredients and cooking steps
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Recipe Title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              error={!!titleError}
              helperText={titleError || 'Minimum 3 characters required'}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              required
            >
              <MenuItem value="Easy">Easy</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Hard">Hard</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder="Optional (e.g., Italian, Asian)"
            />
          </Grid>

          {/* Ingredients section */}
          <Grid item xs={12}>
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Ingredients
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Add ingredients for your recipe
              </Typography>

              {/* Add new ingredient form */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Ingredient Name"
                      value={newIngredient.name}
                      onChange={(e) =>
                        setNewIngredient({ ...newIngredient, name: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && 
                            newIngredient.name.trim() &&
                            newIngredient.quantity &&
                            parseFloat(newIngredient.quantity) > 0 &&
                            newIngredient.unit.trim()) {
                          handleAddIngredient();
                        }
                      }}
                      placeholder="e.g., Flour"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={newIngredient.quantity}
                      onChange={(e) =>
                        setNewIngredient({ ...newIngredient, quantity: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && 
                            newIngredient.name.trim() &&
                            newIngredient.quantity &&
                            parseFloat(newIngredient.quantity) > 0 &&
                            newIngredient.unit.trim()) {
                          handleAddIngredient();
                        }
                      }}
                      placeholder="e.g., 500"
                      inputProps={{ min: 0, step: 0.1 }}
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Unit"
                      value={newIngredient.unit}
                      onChange={(e) =>
                        setNewIngredient({ ...newIngredient, unit: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && 
                            newIngredient.name.trim() &&
                            newIngredient.quantity &&
                            parseFloat(newIngredient.quantity) > 0 &&
                            newIngredient.unit.trim()) {
                          handleAddIngredient();
                        }
                      }}
                      placeholder="e.g., g, ml, pcs"
                      size="small"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddIngredient}
                      disabled={
                        !newIngredient.name.trim() ||
                        !newIngredient.quantity ||
                        parseFloat(newIngredient.quantity) <= 0 ||
                        !newIngredient.unit.trim()
                      }
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Ingredients list */}
              {ingredients.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No ingredients added yet
                </Typography>
              ) : (
                <Box>
                  {ingredients.map((ingredient, index) => (
                    <Box key={ingredient.id}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1.5,
                        }}
                      >
                        <Typography variant="body1">
                          <strong>{ingredient.name}</strong> — {ingredient.quantity} {ingredient.unit}
                        </Typography>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleRemoveIngredient(ingredient.id)}
                          aria-label="Remove ingredient"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      {index < ingredients.length - 1 && <Divider />}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Grid>

          {/* Steps section */}
          <Grid item xs={12}>
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Steps
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Add cooking steps in order
              </Typography>

              {/* Add new step form */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="flex-start">
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Step Description"
                      value={newStep.description}
                      onChange={(e) =>
                        setNewStep({ ...newStep, description: e.target.value })
                      }
                      placeholder="e.g., Mix flour and water"
                      multiline
                      rows={2}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      select
                      label="Step Type"
                      value={newStep.type}
                      onChange={(e) =>
                        setNewStep({
                          ...newStep,
                          type: e.target.value as 'cooking' | 'instruction',
                        })
                      }
                      size="small"
                    >
                      <MenuItem value="cooking">Cooking</MenuItem>
                      <MenuItem value="instruction">Instruction</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Duration (minutes)"
                      type="number"
                      value={newStep.durationMinutes}
                      onChange={(e) =>
                        setNewStep({ ...newStep, durationMinutes: e.target.value })
                      }
                      placeholder="e.g., 15"
                      inputProps={{ min: 1, step: 1 }}
                      size="small"
                      required
                    />
                  </Grid>

                  {/* Cooking type fields */}
                  {newStep.type === 'cooking' && (
                    <>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Temperature"
                          type="number"
                          value={newStep.temperature}
                          onChange={(e) =>
                            setNewStep({ ...newStep, temperature: e.target.value })
                          }
                          placeholder="40-200"
                          inputProps={{ min: 40, max: 200, step: 1 }}
                          size="small"
                          required
                          helperText="40-200"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Speed"
                          type="number"
                          value={newStep.speed}
                          onChange={(e) =>
                            setNewStep({ ...newStep, speed: e.target.value })
                          }
                          placeholder="1-5"
                          inputProps={{ min: 1, max: 5, step: 1 }}
                          size="small"
                          required
                          helperText="1-5"
                        />
                      </Grid>
                    </>
                  )}

                  {/* Instruction type fields */}
                  {newStep.type === 'instruction' && (
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small" required>
                        <InputLabel id="ingredients-select-label">Select Ingredients</InputLabel>
                        <Select
                          labelId="ingredients-select-label"
                          multiple
                          value={newStep.selectedIngredientIds}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewStep({
                              ...newStep,
                              selectedIngredientIds: typeof value === 'string' ? value.split(',') : value,
                            });
                          }}
                          input={<OutlinedInput label="Select Ingredients" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((id) => {
                                const ingredient = ingredients.find((ing) => ing.id === id);
                                return ingredient ? (
                                  <Chip key={id} label={ingredient.name} size="small" />
                                ) : null;
                              })}
                            </Box>
                          )}
                          disabled={ingredients.length === 0}
                        >
                          {ingredients.map((ingredient) => (
                            <MenuItem key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} ({ingredient.quantity} {ingredient.unit})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {ingredients.length === 0 && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                          Add ingredients first to create instruction steps
                        </Typography>
                      )}
                    </Grid>
                  )}

                  <Grid item xs={12} sm={newStep.type === 'cooking' ? 4 : 12}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddStep}
                      disabled={
                        !newStep.description.trim() ||
                        !newStep.durationMinutes ||
                        parseInt(newStep.durationMinutes, 10) <= 0 ||
                        (newStep.type === 'cooking'
                          ? (!newStep.temperature ||
                             parseInt(newStep.temperature, 10) < 40 ||
                             parseInt(newStep.temperature, 10) > 200 ||
                             !newStep.speed ||
                             parseInt(newStep.speed, 10) < 1 ||
                             parseInt(newStep.speed, 10) > 5)
                          : newStep.selectedIngredientIds.length === 0)
                      }
                      sx={{ height: '40px' }}
                    >
                      Add Step
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Steps list */}
              {steps.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No steps added yet
                </Typography>
              ) : (
                <Box>
                  {steps.map((step, index) => (
                    <Box key={step.id}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          py: 2,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="subtitle2" color="primary">
                              Step {index + 1}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: step.type === 'cooking' ? 'primary.light' : 'secondary.light',
                                color: step.type === 'cooking' ? 'primary.dark' : 'secondary.dark',
                              }}
                            >
                              {step.type}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {step.durationMinutes} min
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {step.description}
                          </Typography>
                          {/* Type-specific information */}
                          {step.type === 'cooking' && step.cookingSettings && (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                              <Chip
                                label={`Temp: ${step.cookingSettings.temperature}°`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={`Speed: ${step.cookingSettings.speed}`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          )}
                          {step.type === 'instruction' && step.ingredientIds && step.ingredientIds.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                              {step.ingredientIds.map((ingredientId) => {
                                const ingredient = ingredients.find((ing) => ing.id === ingredientId);
                                return ingredient ? (
                                  <Chip
                                    key={ingredientId}
                                    label={ingredient.name}
                                    size="small"
                                    variant="outlined"
                                    color="secondary"
                                  />
                                ) : null;
                              })}
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', ml: 2 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveStepUp(index)}
                            disabled={index === 0}
                            aria-label="Move step up"
                            sx={{ mb: 0.5 }}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveStepDown(index)}
                            disabled={index === steps.length - 1}
                            aria-label="Move step down"
                            sx={{ mb: 0.5 }}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleRemoveStep(step.id)}
                            aria-label="Remove step"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      {index < steps.length - 1 && <Divider />}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Grid>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Please fix the following errors:
                </Typography>
                <Box component="ul" sx={{ mb: 0, pl: 2 }}>
                  {validationErrors.map((error, index) => (
                    <li key={index}>
                      <Typography variant="body2">{error}</Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            </Grid>
          )}

          {/* Derived fields summary */}
          {(steps.length > 0 || ingredients.length > 0) && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Recipe Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      Total Ingredients
                    </Typography>
                    <Typography variant="h6">{ingredients.length}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      Total Steps
                    </Typography>
                    <Typography variant="h6">{steps.length}</Typography>
                  </Grid>
                  {steps.length > 0 && (
                    <>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Total Time
                        </Typography>
                        <Typography variant="h6">
                          {calculateDerivedFields().totalTimeMinutes} min
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Complexity Score
                        </Typography>
                        <Typography variant="h6">
                          {calculateDerivedFields().complexityScore}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Paper>
            </Grid>
          )}

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
              <Button variant="outlined" onClick={() => navigate('/recipes')}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSave}>
                Save Recipe
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Snackbar for success/error messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default CreateRecipe;

