import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function FloatingThemeToggle() {
  const { dark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed bottom-5 right-5 z-[999] w-11 h-11 flex items-center justify-center rounded-full shadow-lg backdrop-blur-md border transition-all duration-300 hover:scale-110 active:scale-95
        bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700
        text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
    >
      <div className="relative">
        <Sun
          size={18}
          className={`absolute transition-all duration-300 ${
            dark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
          }`}
        />
        <Moon
          size={18}
          className={`transition-all duration-300 ${
            dark ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
          }`}
        />
      </div>
    </button>
  );
}
