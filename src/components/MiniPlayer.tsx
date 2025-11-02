import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Paper,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Chip
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
  tickSecond,
  advanceStep,
} from '../store/slices/sessionSlice';

function MiniPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAnnouncedMinuteRef = useRef<number | null>(null);

  const session = useAppSelector((state) => state.session);
  const recipes = useAppSelector((state) => state.recipes.recipes);

  const activeRecipeId = session.activeRecipeId;
  const activeSession = activeRecipeId ? session.byRecipeId[activeRecipeId] : null;
  const recipe = activeRecipeId ? recipes.find((r) => r.id === activeRecipeId) : null;

  // Timer effect - keeps the timer running when MiniPlayer is visible
  useEffect(() => {
    if (!activeSession || !activeSession.isRunning || !activeRecipeId || !recipe) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      // Get latest session state
      const currentSession = session.byRecipeId[activeRecipeId];
      if (!currentSession || !currentSession.isRunning) {
        return;
      }

      const now = Date.now();
      const lastTickTs = currentSession.lastTickTs || now;
      const elapsedMs = now - lastTickTs;

      if (elapsedMs >= 1000) {
        dispatch(tickSecond({ recipeId: activeRecipeId, elapsedMs }));
      }

      // Check if current step is complete (auto-advance)
      const latestSession = session.byRecipeId[activeRecipeId];
      if (latestSession && latestSession.stepRemainingSec <= 0 && latestSession.isRunning) {
        const currentStepIndex = latestSession.currentStepIndex;
        const isLastStep = currentStepIndex >= recipe.steps.length - 1;

        if (isLastStep) {
          dispatch(endSession(activeRecipeId));
        } else {
          const nextStep = recipe.steps[currentStepIndex + 1];
          const nextStepDurationSec = nextStep.durationMinutes * 60;
          
          // Calculate overall remaining: current step + all future steps
          const futureStepsDurationSec = recipe.steps
            .slice(currentStepIndex + 1)
            .reduce((sum, step) => sum + step.durationMinutes * 60, 0);
          
          dispatch(advanceStep({ 
            recipeId: activeRecipeId, 
            nextStepDurationSec,
            overallRemainingSec: futureStepsDurationSec,
          }));
        }
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeSession, activeRecipeId, dispatch, recipe, session.byRecipeId]);

  // Timer minute announcement effect
  useEffect(() => {
    if (!activeSession || !activeSession.isRunning) {
      lastAnnouncedMinuteRef.current = null;
      return;
    }

    const currentMinutes = Math.floor(activeSession.stepRemainingSec / 60);
    if (lastAnnouncedMinuteRef.current !== null && lastAnnouncedMinuteRef.current !== currentMinutes) {
      // Announce minute change
      const announcement = currentMinutes === 0 
        ? 'Step time remaining: less than 1 minute' 
        : `Step time remaining: ${currentMinutes} minute${currentMinutes !== 1 ? 's' : ''}`;
      
      // Use aria-live region for screen reader announcements
      const announcementEl = document.getElementById('mini-player-timer-announcement');
      if (announcementEl) {
        announcementEl.textContent = announcement;
      }
    }
    lastAnnouncedMinuteRef.current = currentMinutes;
  }, [activeSession]);

  // Space key handler for pause/resume (only when mini player is visible)
  useEffect(() => {
    if (!activeRecipeId || !activeSession || !recipe || location.pathname === `/cook/${activeRecipeId}`) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Space if not typing in an input field
      if (e.key === ' ' && e.target instanceof HTMLElement && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (activeSession.isRunning) {
          dispatch(pauseSession(activeRecipeId));
        } else {
          dispatch(resumeSession(activeRecipeId));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeRecipeId, activeSession, recipe, location.pathname, dispatch]);

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
      const nextStepIndex = activeSession.currentStepIndex + 1;
      const nextStep = recipe.steps[nextStepIndex];
      const nextStepDurationSec = nextStep.durationMinutes * 60;
      
      // Calculate overall remaining: current step + all future steps
      const futureStepsDurationSec = recipe.steps
        .slice(nextStepIndex)
        .reduce((sum, step) => sum + step.durationMinutes * 60, 0);
      
      dispatch(stopCurrentStep({ 
        recipeId: activeRecipeId, 
        isLastStep: false, 
        nextStepDurationSec,
        overallRemainingSec: futureStepsDurationSec,
      }));
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
            aria-label={`Step progress: ${stepProgress}%`}
            role="progressbar"
            aria-valuenow={stepProgress}
            aria-valuemin={0}
            aria-valuemax={100}
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
          {currentStep && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                mt: 0.25,
                color: 'text.secondary',
              }}
            >
              {currentStep.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Step {activeSession.currentStepIndex + 1} of {recipe.steps.length} · {formatTime(stepRemainingSec)}
            </Typography>
            
            {/* Hidden aria-live region for timer minute announcements only */}
            <Box
              id="mini-player-timer-announcement"
              component="div"
              aria-live="polite"
              aria-atomic="true"
              sx={{
                position: 'absolute',
                left: '-9999px',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
              }}
            />
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

