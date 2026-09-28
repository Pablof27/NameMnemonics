import type { Theme } from '../hooks/useTheme'
import { Icon, type IconName } from './Icon'

const OPTIONS: { value: Theme; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Match system theme', icon: 'monitor' },
  { value: 'light', label: 'Light theme', icon: 'sun' },
  { value: 'dark', label: 'Dark theme', icon: 'moon' },
]

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <fieldset className="segmented segmented-icons">
      <legend className="visually-hidden">Theme</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} data-selected={theme === option.value} title={option.label}>
          <input
            type="radio"
            name="theme"
            className="visually-hidden"
            checked={theme === option.value}
            onChange={() => onChange(option.value)}
          />
          <Icon name={option.icon} size={18} />
          <span className="visually-hidden">{option.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
