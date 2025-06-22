import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';

// Only access localStorage in the browser
type PersistedState = {
  user: {
    user: {
      id: string;
      email: string;
      token: string;
    } | null;
  };
};

const loadState = (): PersistedState | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const serializedState = localStorage.getItem('reduxState');
    return serializedState ? JSON.parse(serializedState) : undefined;
  } catch (err) {
    return undefined;
  }
};

const saveState = (state: PersistedState) => {
  if (typeof window === 'undefined') return;
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('reduxState', serializedState);
  } catch (err) {
    console.error('Could not save state to localStorage', err);
  }
};

const store = configureStore({
  reducer: {
    user: userReducer,
  },
  // Only preload state in the browser
  preloadedState: typeof window !== 'undefined' ? loadState() : undefined,
});

if (typeof window !== 'undefined') {
  store.subscribe(() => {
    saveState(store.getState() as PersistedState);
  });
}

export { store };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
