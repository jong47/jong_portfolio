import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react'

function requireSiteKey(): string {
    const key = import.meta.env.VITE_TURNSTILE_SITE_KEY
    if (!key) throw new Error('VITE_TURNSTILE_SITE_KEY is not set')
    return key
}

const SITE_KEY = requireSiteKey()

type Verify = () => Promise<string | null>

const VerifyContext = createContext<Verify>(() => Promise.resolve(null))

export const useVerify = () => useContext(VerifyContext)

export function VerifyProvider({ children }: { children: ReactNode }) {
    const widget = useRef<TurnstileInstance>(undefined)
    const pending = useRef<((token: string | null) => void) | null>(null)

    const settle = useCallback((token: string | null) => {
        pending.current?.(token)
        pending.current = null
    }, [])

    const verify = useCallback<Verify>(() => {
        const instance = widget.current
        if (!instance) return Promise.resolve(null)

        settle(null)
        instance.reset()
        instance.execute()

        return new Promise((resolve) => {
            pending.current = resolve
        })
    }, [settle])

    return (
        <VerifyContext value={verify}>
            {children}
            <div className="verify-host">
                {/* interaction-only: Cloudflare puts its widget on screen when it wants
                    something from the visitor and renders nothing when it doesn't. The
                    button's own busy state covers the silent case. */}
                <Turnstile
                    ref={widget}
                    siteKey={SITE_KEY}
                    options={{ execution: 'execute', appearance: 'interaction-only' }}
                    onSuccess={settle}
                    onError={() => settle(null)}
                    onExpire={() => settle(null)}
                    onTimeout={() => settle(null)}
                />
            </div>
        </VerifyContext>
    )
}
