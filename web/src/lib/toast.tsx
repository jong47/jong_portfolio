import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
    type ReactNode,
} from 'react'

const DURATION = 2600

const ToastContext = createContext<(message: string) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [message, setMessage] = useState<string | null>(null)
    const timer = useRef<number>(undefined)

    const notify = useCallback((next: string) => {
        window.clearTimeout(timer.current)
        setMessage(next)
        timer.current = window.setTimeout(() => setMessage(null), DURATION)
    }, [])

    return (
        <ToastContext value={notify}>
            {children}
            <div className="toast-host" role="status" aria-live="polite">
                {message ? <p className="toast codec-frame">{message}</p> : null}
            </div>
        </ToastContext>
    )
}
