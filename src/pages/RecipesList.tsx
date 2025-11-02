import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Chip,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { toggleFavorite } from '../store/slices/recipesSlice';
import { saveRecipes } from '../utils/localStorage';
import type { Difficulty } from '../types/recipe';

type SortOrder = 'asc' | 'desc';

function RecipesList() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const recipes = useAppSelector((state) => state.recipes.recipes);
  const session = useAppSelector((state) => state.session);
  
  // Check if mini player is visible
  const hasMiniPlayer = !!session.activeRecipeId;
  
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Calculate total time for a recipe
  const getTotalTime = (recipe: typeof recipes[0]) => {
    return recipe.steps.reduce((sum, step) => sum + step.durationMinutes, 0);
  };

  // Filter and sort recipes
  const filteredAndSortedRecipes = useMemo(() => {
    let filtered = recipes;

    // Filter by difficulty
    if (selectedDifficulties.length > 0) {
      filtered = filtered.filter((recipe) =>
        selectedDifficulties.includes(recipe.difficulty)
      );
    }

    // Sort by total time
    const sorted = [...filtered].sort((a, b) => {
      const timeA = getTotalTime(a);
      const timeB = getTotalTime(b);
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });

    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, selectedDifficulties, sortOrder]);

  const handleToggleFavorite = (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(toggleFavorite(recipeId));
    
    // Update localStorage
    const updatedRecipes = recipes.map((recipe) =>
      recipe.id === recipeId ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe
    );
    saveRecipes(updatedRecipes);
  };

  const handleRecipeClick = (recipeId: string) => {
    navigate(`/cook/${recipeId}`);
  };

  const difficultyColors: Record<Difficulty, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
    Easy: 'success',
    Medium: 'warning',
    Hard: 'error',
  };

  return (
      <Container 
        maxWidth="lg" 
        sx={{ 
          mt: 4, 
          mb: 4,
          pb: hasMiniPlayer ? 12 : 4, // extra bottom padding when mini player is visible
        }}
      >
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          All Recipes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/create')}
        >
          Create Recipe
        </Button>
      </Box>

      {/* Filters and Sort */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Filter by Difficulty
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  multiple
                  value={selectedDifficulties}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedDifficulties(typeof value === 'string' ? [] : value as Difficulty[]);
                  }}
                  renderValue={(selected) => {
                    if ((selected as Difficulty[]).length === 0) {
                      return <Typography variant="body2" color="text.secondary">All difficulties</Typography>;
                    }
                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                        {(selected as Difficulty[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    );
                  }}
                  displayEmpty
                  sx={{ mt: 0 }}
                >
                  <MenuItem value="Easy">Easy</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="Hard">Hard</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Sort by Total Time
              </Typography>
              <ToggleButtonGroup
                value={sortOrder}
                exclusive
                onChange={(_e, newOrder) => {
                  if (newOrder !== null) {
                    setSortOrder(newOrder);
                  }
                }}
                size="small"
                fullWidth
              >
                <ToggleButton value="asc">Ascending</ToggleButton>
                <ToggleButton value="desc">Descending</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredAndSortedRecipes.length} of {recipes.length} recipes
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Recipes List */}
      {filteredAndSortedRecipes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No recipes found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {recipes.length === 0
              ? 'Create your first recipe to get started!'
              : 'Try adjusting your filters.'}
          </Typography>
          {recipes.length === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/create')}
            >
              Create Recipe
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredAndSortedRecipes.map((recipe) => {
            const totalTime = getTotalTime(recipe);
            return (
              <Grid item xs={12} sm={6} md={4} key={recipe.id}>
                <Paper
                  sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 4,
                    },
                    transition: 'box-shadow 0.2s',
                  }}
                  onClick={() => handleRecipeClick(recipe.id)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ flex: 1, pr: 1 }}>
                      {recipe.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleToggleFavorite(recipe.id, e)}
                      sx={{ ml: 'auto' }}
                    >
                      {recipe.isFavorite ? (
                        <StarIcon color="warning" />
                      ) : (
                        <StarBorderIcon />
                      )}
                    </IconButton>
                  </Box>

                  {recipe.cuisine && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                      {recipe.cuisine}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={recipe.difficulty}
                      color={difficultyColors[recipe.difficulty]}
                      size="small"
                    />
                    <Chip
                      label={`${totalTime} min`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto' }}>
                    {recipe.ingredients.length} ingredients • {recipe.steps.length} steps
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}

export default RecipesList;

