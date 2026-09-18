import { useTheme } from '../storage/themeContext';
import { buttonStyles } from './buttonStyles';
import { MoonIcon, SunIcon } from './icons';

/**
 * Switches between light and dark. A toggle button: screen readers hear "Dark mode" and whether it
 * is on; the icon shows what a tap switches to.
 */
export function ThemeToggle() {
  const { theme, setPreference } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label="Dark mode"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setPreference(dark ? 'light' : 'dark')}
      className={`${buttonStyles.icon} text-xl`}
    >
      {dark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
    </button>
  );
}
