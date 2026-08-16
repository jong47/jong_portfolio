import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { contactEnabled, sendMessage, type Draft } from '../lib/contact'
import { useToast } from '../lib/toast'

const EMPTY: Draft = { name: '', email: '', message: '' }

export function ContactDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const notify = useToast()
    const first = useRef<HTMLInputElement>(null)
    const [draft, setDraft] = useState<Draft>(EMPTY)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        first.current?.focus()

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [open, onClose])

    if (!open) return null

    function set(field: keyof Draft) {
        return (event: { target: { value: string } }) =>
            setDraft((current) => ({ ...current, [field]: event.target.value }))
    }

    async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (busy) return

        setBusy(true)
        setError(null)

        try {
            await sendMessage(draft)
            setDraft(EMPTY)
            onClose()
            notify('message sent')
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Something went wrong.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="dialog-host">
            <button
                type="button"
                className="dialog-scrim"
                aria-label="Close"
                onClick={onClose}
            />
            <div
                className="dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="contact-title"
            >
                <div className="dialog-head">
                    <h2 id="contact-title" className="t-section">
                        Contact
                    </h2>
                    <button
                        type="button"
                        className="icon-button"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </div>

                <form className="dialog-form" onSubmit={(event) => void onSubmit(event)}>
                    <label className="field">
                        <span className="field-label">Name</span>
                        <input
                            ref={first}
                            className="field-input"
                            value={draft.name}
                            onChange={set('name')}
                            required
                            maxLength={120}
                        />
                    </label>

                    <label className="field">
                        <span className="field-label">Email</span>
                        <input
                            className="field-input"
                            type="email"
                            value={draft.email}
                            onChange={set('email')}
                            required
                        />
                    </label>

                    <label className="field">
                        <span className="field-label">Message</span>
                        <textarea
                            className="field-input field-area"
                            value={draft.message}
                            onChange={set('message')}
                            required
                            maxLength={4000}
                            rows={5}
                        />
                    </label>

                    {error ? (
                        <p className="field-error" role="alert">
                            {error}
                        </p>
                    ) : null}

                    <button
                        type="submit"
                        className="dialog-send"
                        disabled={busy || !contactEnabled}
                    >
                        {busy ? 'sending…' : 'send'}
                    </button>

                    <p className="dialog-note">Your address is only used to reply.</p>
                </form>
            </div>
        </div>
    )
}
