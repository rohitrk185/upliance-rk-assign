import { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { tickSecond, advanceStep, endSession } from '../store/slices/sessionSlice';

function SessionTimer() {
  const dispatch = useAppDispatch();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const session = useAppSelector((state) => state.session);
  const recipes = useAppSelector((state) => state.recipes.recipes);
  const activeRecipeId = session.activeRecipeId;
  const activeSession = activeRecipeId ? session.byRecipeId[activeRecipeId] : null;
  const recipe = activeRecipeId ? recipes.find((r) => r.id === activeRecipeId) : null;

  useEffect(() => {
    if (!activeSession || !activeSession.isRunning || !activeRecipeId || !recipe) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      // Get latest session state - read directly from store to avoid stale closures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = (window as any).__REDUX_STORE__?.getState();
      const currentSession = state?.session?.byRecipeId?.[activeRecipeId];
      
      if (!currentSession || !currentSession.isRunning) {
        return;
      }

      const now = Date.now();
      const lastTickTs = currentSession.lastTickTs || now;
      const elapsedMs = now - lastTickTs;

      if (elapsedMs >= 1000) {
        dispatch(tickSecond({ recipeId: activeRecipeId, elapsedMs }));
      }

      // Check if current step is complete after tick
      // Use a small timeout to let the state update
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedState = (window as any).__REDUX_STORE__?.getState();
        const updatedSession = updatedState?.session?.byRecipeId?.[activeRecipeId];
        if (updatedSession && updatedSession.stepRemainingSec <= 0 && updatedSession.isRunning) {
          const currentStepIndex = updatedSession.currentStepIndex;
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
      }, 50);
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.isRunning, activeSession?.currentStepIndex, activeRecipeId, dispatch, recipe]);

  return null; // This component doesn't render anything
}

export default SessionTimer;

