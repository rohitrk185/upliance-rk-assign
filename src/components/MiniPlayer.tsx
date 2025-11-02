import { useNavigate, useLocation } from 'react-router-dom';
import {
  Paper,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
  Button,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  pauseSession,
  resumeSession,
  stopCurrentStep,
  endSession,
} from '../store/slices/sessionSlice';

function MiniPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const session = useAppSelector((state) => state.session);
  const recipes = useAppSelector((state) => state.recipes.recipes);

  const activeRecipeId = session.activeRecipeId;
  const activeSession = activeRecipeId ? session.byRecipeId[activeRecipeId] : null;
  const recipe = activeRecipeId ? recipes.find((r) => r.id === activeRecipeId) : null;

  // Don't show mini player on the cooking page itself
  if (!activeRecipeId || !activeSession || !recipe || location.pathname === `/cook/${activeRecipeId}`) {
    return null;
  }

  const currentStep = recipe.steps[activeSession.currentStepIndex];
  const stepDurationSec = currentStep ? currentStep.durationMinutes * 60 : 0;
  const stepRemainingSec = activeSession.stepRemainingSec;
  const stepElapsedSec = Math.max(0, stepDurationSec - stepRemainingSec);
  const stepProgress = stepDurationSec > 0 ? Math.round((stepElapsedSec / stepDurationSec) * 100) : 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePauseResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeSession.isRunning) {
      dispatch(pauseSession(activeRecipeId));
    } else {
      dispatch(resumeSession(activeRecipeId));
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isLastStep = activeSession.currentStepIndex >= recipe.steps.length - 1;
    if (isLastStep) {
      dispatch(endSession(activeRecipeId));
    } else {
      const nextStep = recipe.steps[activeSession.currentStepIndex + 1];
      const nextStepDurationSec = nextStep.durationMinutes * 60;
      dispatch(stopCurrentStep({ recipeId: activeRecipeId, isLastStep: false, nextStepDurationSec }));
    }
  };

  const handleClick = () => {
    navigate(`/cook/${activeRecipeId}`);
  };

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        left: 16,
        maxWidth: 600,
        margin: '0 auto',
        p: 2,
        cursor: 'pointer',
        zIndex: 1000,
        '&:hover': {
          boxShadow: 8,
        },
        transition: 'box-shadow 0.2s',
      }}
      onClick={handleClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Circular progress */}
        <Box sx={{ position: 'relative', display: 'flex' }}>
          <CircularProgress
            variant="determinate"
            value={stepProgress}
            size={50}
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
            <Typography variant="caption" component="div" color="text.primary" fontSize="0.7rem">
              {stepProgress}%
            </Typography>
          </Box>
        </Box>

        {/* Recipe info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {recipe.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Step {activeSession.currentStepIndex + 1} of {recipe.steps.length} · {formatTime(stepRemainingSec)}
            </Typography>
            <Chip
              label={activeSession.isRunning ? 'Running' : 'Paused'}
              size="small"
              color={activeSession.isRunning ? 'success' : 'default'}
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          </Box>
        </Box>

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={handlePauseResume}
            color="primary"
          >
            {activeSession.isRunning ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
          </IconButton>
          <IconButton
            size="small"
            onClick={handleStop}
            color="error"
          >
            <StopIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}

export default MiniPlayer;

