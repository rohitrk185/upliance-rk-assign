import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Chip,
  IconButton,
  LinearProgress,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  startSession,
  pauseSession,
  resumeSession,
  stopCurrentStep,
  tickSecond,
  advanceStep,
  endSession,
} from '../store/slices/sessionSlice';
import { toggleFavorite } from '../store/slices/recipesSlice';
import { saveRecipes } from '../utils/localStorage';

function CookingSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recipes = useAppSelector((state) => state.recipes.recipes);
  const session = useAppSelector((state) => state.session);
  const activeSession = id ? session.byRecipeId[id] : null;
  const activeRecipeId = session.activeRecipeId;
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const recipe = recipes.find((r) => r.id === id);

  // Calculate total duration and other derived values
  const { currentStep, stepProgress, overallProgress, stepRemainingSec, overallRemainingSec } =
    useMemo(() => {
      if (!recipe || !activeSession) {
        return {
          totalDurationSec: 0,
          currentStep: null,
          stepProgress: 0,
          overallProgress: 0,
          stepRemainingSec: 0,
          overallRemainingSec: 0,
        };
      }

      const totalDurationSec = recipe.steps.reduce((sum, step) => sum + step.durationMinutes * 60, 0);
      const currentStep = recipe.steps[activeSession.currentStepIndex];
      const stepDurationSec = currentStep ? currentStep.durationMinutes * 60 : 0;
      const stepRemainingSec = activeSession.stepRemainingSec;
      const stepElapsedSec = Math.max(0, stepDurationSec - stepRemainingSec);
      const stepProgress = stepDurationSec > 0 ? Math.round((stepElapsedSec / stepDurationSec) * 100) : 0;

      const overallRemainingSec = activeSession.overallRemainingSec;
      const overallElapsedSec = totalDurationSec - overallRemainingSec;
      const overallProgress = totalDurationSec > 0 ? Math.round((overallElapsedSec / totalDurationSec) * 100) : 0;

      return {
        totalDurationSec,
        currentStep,
        stepProgress,
        overallProgress,
        stepRemainingSec,
        overallRemainingSec,
      };
    }, [recipe, activeSession]);

  // Timer effect
  useEffect(() => {
    if (!activeSession || !activeSession.isRunning || !id || !recipe) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      // Get latest session state
      const currentSession = session.byRecipeId[id];
      if (!currentSession || !currentSession.isRunning) {
        return;
      }

      const now = Date.now();
      const lastTickTs = currentSession.lastTickTs || now;
      const elapsedMs = now - lastTickTs;

      if (elapsedMs >= 1000) {
        dispatch(tickSecond({ recipeId: id, elapsedMs }));
      }
    }, 100); // Check more frequently for accuracy

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.isRunning, id, dispatch, recipe, session.byRecipeId]);

  // Auto-advance effect
  useEffect(() => {
    if (!activeSession || !id || !recipe) return;

    if (activeSession.stepRemainingSec <= 0 && activeSession.isRunning) {
      const isLastStep = activeSession.currentStepIndex >= recipe.steps.length - 1;

      if (isLastStep) {
        dispatch(endSession(id));
        setSnackbarMessage('Step ended. Recipe session complete!');
        setSnackbarOpen(true);
      } else {
        const nextStep = recipe.steps[activeSession.currentStepIndex + 1];
        const nextStepDurationSec = nextStep.durationMinutes * 60;
        dispatch(advanceStep({ recipeId: id, nextStepDurationSec }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.stepRemainingSec, activeSession?.currentStepIndex, activeSession?.isRunning, id, dispatch, recipe]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = () => {
    if (!recipe || !id) return;

    const totalDurationSec = recipe.steps.reduce((sum, step) => sum + step.durationMinutes * 60, 0);
    const firstStepDurationSec = recipe.steps[0]?.durationMinutes * 60 || 0;

    dispatch(startSession({ recipeId: id, totalDurationSec, firstStepDurationSec }));
  };

  const handlePauseResume = () => {
    if (!id || !activeSession) return;
    if (activeSession.isRunning) {
      dispatch(pauseSession(id));
    } else {
      dispatch(resumeSession(id));
    }
  };

  const handleStop = () => {
    if (!recipe || !id || !activeSession) return;

    const isLastStep = activeSession.currentStepIndex >= recipe.steps.length - 1;

    if (isLastStep) {
      dispatch(endSession(id));
      setSnackbarMessage('Step ended. Recipe session complete!');
      setSnackbarOpen(true);
    } else {
      const nextStep = recipe.steps[activeSession.currentStepIndex + 1];
      const nextStepDurationSec = nextStep.durationMinutes * 60;
      dispatch(stopCurrentStep({ recipeId: id, isLastStep: false, nextStepDurationSec }));
      setSnackbarMessage('Step ended. Moving to next step...');
      setSnackbarOpen(true);
    }
  };

  const handleToggleFavorite = () => {
    if (!id) return;
    dispatch(toggleFavorite(id));
    const updatedRecipes = recipes.map((r) =>
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    );
    saveRecipes(updatedRecipes);
  };

  const difficultyColors: Record<string, 'success' | 'warning' | 'error'> = {
    Easy: 'success',
    Medium: 'warning',
    Hard: 'error',
  };

  if (!recipe) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Recipe not found
          </Typography>
          <Button variant="contained" onClick={() => navigate('/recipes')} sx={{ mt: 2 }}>
            Back to Recipes
          </Button>
        </Paper>
      </Container>
    );
  }

  const totalTimeMinutes = recipe.steps.reduce((sum, step) => sum + step.durationMinutes, 0);
  const hasActiveSession = !!activeSession;
  const isRunning = activeSession?.isRunning || false;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/recipes')} sx={{ mb: 2 }}>
        Back to Recipes
      </Button>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {recipe.title}
            </Typography>
            {recipe.cuisine && (
              <Typography variant="body2" color="text.secondary">
                {recipe.cuisine}
              </Typography>
            )}
          </Box>
          <IconButton onClick={handleToggleFavorite}>
            {recipe.isFavorite ? <StarIcon color="warning" /> : <StarBorderIcon />}
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={recipe.difficulty} color={difficultyColors[recipe.difficulty]} />
          <Chip label={`${totalTimeMinutes} min total`} variant="outlined" />
        </Box>
      </Paper>

      {/* Active Step Panel */}
      {hasActiveSession && currentStep && (
        <Paper sx={{ p: 4, mb: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Step {activeSession.currentStepIndex + 1} of {recipe.steps.length}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {currentStep.description}
          </Typography>

          {/* Context chips */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
            {currentStep.type === 'cooking' && currentStep.cookingSettings && (
              <>
                <Chip label={`Temp: ${currentStep.cookingSettings.temperature}°`} variant="outlined" />
                <Chip label={`Speed: ${currentStep.cookingSettings.speed}`} variant="outlined" />
              </>
            )}
            {currentStep.type === 'instruction' && currentStep.ingredientIds && (
              <>
                {currentStep.ingredientIds.map((ingredientId) => {
                  const ingredient = recipe.ingredients.find((ing) => ing.id === ingredientId);
                  return ingredient ? (
                    <Chip key={ingredientId} label={ingredient.name} color="secondary" variant="outlined" />
                  ) : null;
                })}
              </>
            )}
          </Box>

          {/* Circular progress */}
          <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
            <CircularProgress
              variant="determinate"
              value={stepProgress}
              size={120}
              thickness={4}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h5" component="div" color="text.primary">
                {formatTime(stepRemainingSec)}
              </Typography>
            </Box>
          </Box>

          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {isRunning ? (
              <Button
                variant="contained"
                startIcon={<PauseIcon />}
                onClick={handlePauseResume}
                size="large"
              >
                Pause
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handlePauseResume}
                size="large"
              >
                Resume
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleStop}
              size="large"
            >
              STOP
            </Button>
          </Box>
        </Paper>
      )}

      {/* Start Session Button (when no active session) */}
      {!hasActiveSession && (
        <Paper sx={{ p: 4, mb: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Ready to start cooking?
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={handleStartSession}
            disabled={activeRecipeId !== null && activeRecipeId !== id}
            sx={{ mt: 2 }}
          >
            Start Session
          </Button>
          {activeRecipeId !== null && activeRecipeId !== id && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              Another recipe is currently active. Please stop it first.
            </Typography>
          )}
        </Paper>
      )}

      {/* Overall Progress */}
      {hasActiveSession && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Overall Progress
          </Typography>
          <LinearProgress variant="determinate" value={overallProgress} sx={{ height: 10, borderRadius: 5, mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Overall remaining: {formatTime(overallRemainingSec)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {overallProgress}%
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Timeline */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Timeline
        </Typography>
        <Box>
          {recipe.steps.map((step, index) => {
            const isCompleted = hasActiveSession && index < activeSession.currentStepIndex;
            const isCurrent = hasActiveSession && index === activeSession.currentStepIndex;
            // const isUpcoming = !hasActiveSession || index > activeSession.currentStepIndex;

            return (
              <Box
                key={step.id}
                sx={{
                  p: 2,
                  mb: 1,
                  borderLeft: isCurrent ? 3 : 1,
                  borderColor: isCurrent ? 'primary.main' : 'divider',
                  bgcolor: isCompleted
                    ? 'action.selected'
                    : isCurrent
                    ? 'primary.light'
                    : 'background.paper',
                  opacity: isCompleted ? 0.7 : 1,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2">
                      Step {index + 1}: {step.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Chip label={step.type} size="small" variant="outlined" />
                      <Chip label={`${step.durationMinutes} min`} size="small" variant="outlined" />
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Upcoming'}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default CookingSession;

