// utils/waTheme.js
//
// Light/dark for the WhatsApp screens, with the same three choices WhatsApp
// itself offers: follow the phone, or force one.
//
// A small module-level store rather than a context provider: the setting is
// read by two screens, and threading a provider through App.tsx would mean
// touching the navigation root for something this local. Listeners keep every
// mounted screen in step, so toggling on the chat list also re-themes an open
// thread behind it.

import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from './storage';
import { WA_LIGHT, WA_DARK } from './theme';

const KEY = 'wa_theme_mode';

export const MODES = ['system', 'light', 'dark'];

let mode = 'system';
let hydrated = false;
const listeners = new Set();

const notify = () => {
  listeners.forEach(fn => fn(mode));
};

/** Persisted, so the choice survives a restart. */
export const setWaThemeMode = async next => {
  if (!MODES.includes(next)) return;

  mode = next;
  notify();

  await storage.set(KEY, next);
};

/** The stored choice: 'system' | 'light' | 'dark'. */
export const useWaThemeMode = () => {
  const [current, setCurrent] = useState(mode);

  useEffect(() => {
    listeners.add(setCurrent);

    // Read the saved value once per app run, not once per screen.
    if (!hydrated) {
      hydrated = true;

      storage
        .get(KEY)
        .then(saved => {
          if (saved && MODES.includes(saved) && saved !== mode) {
            mode = saved;
            notify();
          }
        })
        .catch(() => {});
    }

    return () => {
      listeners.delete(setCurrent);
    };
  }, []);

  return current;
};

/**
 * The palette to render with, plus the mode behind it.
 * Re-renders when either the setting or the phone's own theme changes.
 */
export const useWaTheme = () => {
  const system = useColorScheme();
  const current = useWaThemeMode();

  const dark = current === 'dark' || (current === 'system' && system === 'dark');

  return { dark, mode: current, WA: dark ? WA_DARK : WA_LIGHT };
};
