import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface SessionState {
  activeRecipeId: string | null;
  byRecipeId: Record<string, {
    currentStepIndex: number; // 0-based
    isRunning: boolean;
    stepRemainingSec: number; // current step remaining
    overallRemainingSec: number; // current + future steps
    lastTickTs?: number; // for drift-safe deltas
  }>;
}

const initialState: SessionState = {
  activeRecipeId: null,
  byRecipeId: {},
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    startSession: (state, action: PayloadAction<{ recipeId: string; totalDurationSec: number; firstStepDurationSec: number }>) => {
      const { recipeId, totalDurationSec, firstStepDurationSec } = action.payload;
      
      // Only one active session allowed
      if (state.activeRecipeId && state.activeRecipeId !== recipeId) {
        return; // Don't start if another session is active
      }

      state.activeRecipeId = recipeId;
      state.byRecipeId[recipeId] = {
        currentStepIndex: 0,
        isRunning: true,
        stepRemainingSec: firstStepDurationSec,
        overallRemainingSec: totalDurationSec,
        lastTickTs: Date.now(),
      };
    },
    pauseSession: (state, action: PayloadAction<string>) => {
      const recipeId = action.payload;
      const session = state.byRecipeId[recipeId];
      if (session) {
        session.isRunning = false;
        // Keep lastTickTs for resume
      }
    },
    resumeSession: (state, action: PayloadAction<string>) => {
      const recipeId = action.payload;
      const session = state.byRecipeId[recipeId];
      if (session) {
        session.isRunning = true;
        session.lastTickTs = Date.now(); // Reset timestamp for drift-safe calculations
      }
    },
    tickSecond: (state, action: PayloadAction<{ recipeId: string; elapsedMs: number }>) => {
      const { recipeId, elapsedMs } = action.payload;
      const session = state.byRecipeId[recipeId];
      
      if (!session || !session.isRunning) {
        return;
      }

      const elapsedSec = Math.floor(elapsedMs / 1000);
      
      // Update remaining times
      session.stepRemainingSec = Math.max(0, session.stepRemainingSec - elapsedSec);
      session.overallRemainingSec = Math.max(0, session.overallRemainingSec - elapsedSec);
      session.lastTickTs = Date.now();
    },
    stopCurrentStep: (state, action: PayloadAction<{ recipeId: string; isLastStep: boolean; nextStepDurationSec?: number; overallRemainingSec?: number }>) => {
      const { recipeId, isLastStep, nextStepDurationSec, overallRemainingSec } = action.payload;
      const session = state.byRecipeId[recipeId];
      
      if (!session) {
        return;
      }

      if (isLastStep) {
        // End session
        delete state.byRecipeId[recipeId];
        if (state.activeRecipeId === recipeId) {
          state.activeRecipeId = null;
        }
      } else if (nextStepDurationSec !== undefined) {
        // Auto-advance to next step
        session.currentStepIndex += 1;
        session.stepRemainingSec = nextStepDurationSec;
        if (overallRemainingSec !== undefined) {
          session.overallRemainingSec = overallRemainingSec;
        }
        session.isRunning = true;
        session.lastTickTs = Date.now();
      }
    },
    advanceStep: (state, action: PayloadAction<{ recipeId: string; nextStepDurationSec: number; overallRemainingSec: number }>) => {
      const { recipeId, nextStepDurationSec, overallRemainingSec } = action.payload;
      const session = state.byRecipeId[recipeId];
      
      if (session) {
        session.currentStepIndex += 1;
        session.stepRemainingSec = nextStepDurationSec;
        session.overallRemainingSec = overallRemainingSec;
        session.isRunning = true;
        session.lastTickTs = Date.now();
      }
    },
    endSession: (state, action: PayloadAction<string>) => {
      const recipeId = action.payload;
      delete state.byRecipeId[recipeId];
      if (state.activeRecipeId === recipeId) {
        state.activeRecipeId = null;
      }
    },
  },
});

export const {
  startSession,
  pauseSession,
  resumeSession,
  tickSecond,
  stopCurrentStep,
  advanceStep,
  endSession,
} = sessionSlice.actions;

export default sessionSlice.reducer;

