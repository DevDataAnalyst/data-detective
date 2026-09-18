import { createContext, useContext, useSyncExternalStore } from 'react';
import { createMemoryStore } from './keyValue';
import { createThemeStore, type ThemePreference, type ThemeState } from './theme';

/**
 * The theme store. Outside a provider (isolated component tests) this is a throwaway store that
 * touches nothing, so components never need to guard their use of it.
 */
export const ThemeContext = createContext(
  createThemeStore({ storage: createMemoryStore(), media: null, root: null }),
);

export function useTheme(): ThemeState & { setPreference: (preference: ThemePreference) => void } {
  const store = useContext(ThemeContext);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...state, setPreference: store.setPreference };
}
