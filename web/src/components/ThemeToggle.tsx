import { useTheme } from '../lib/theme'

export function ThemeToggle() {
    const { resolved, toggle } = useTheme()
    const next = resolved === 'dark' ? 'light' : 'dark'

    return (
        <button
            type="button"
            onClick={toggle}
            className="icon-button"
            title={`Switch to ${next} mode`}
            aria-label={`Switch to ${next} mode`}
        >
            <span aria-hidden="true">{resolved === 'dark' ? '●' : '○'}</span>
        </button>
    )
}
