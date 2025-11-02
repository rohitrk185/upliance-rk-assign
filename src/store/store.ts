import { configureStore } from '@reduxjs/toolkit';
import recipesReducer from './slices/recipesSlice';
import sessionReducer from './slices/sessionSlice';

export const store = configureStore({
  reducer: {
    recipes: recipesReducer,
    session: sessionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

