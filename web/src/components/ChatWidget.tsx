import { useEffect, useState, type SubmitEvent } from 'react'
import { chatEnabled, sendMessage } from '../chat/client'

type Message = {
    id: number
    role: 'you' | 'bot'
    text: string
}

export function ChatWidget() {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [draft, setDraft] = useState('')
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') setOpen(false)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [open])

    async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        const text = draft.trim()
        if (!text || pending) return

        setMessages((prev) => [...prev, { id: prev.length, role: 'you', text }])
        setDraft('')
        setPending(true)
        setError(null)

        try {
            const reply = await sendMessage(text)
            setMessages((prev) => [
                ...prev,
                { id: prev.length, role: 'bot', text: reply },
            ])
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Something went wrong.')
        } finally {
            setPending(false)
        }
    }

    return (
        <div className="chat-dock">
            {open ? (
                <section className="chat-panel codec-frame" aria-label="Codec">
                    <header className="chat-head">
                        <span className="chat-id">
                            <span className="t-section">Codec</span>
                            <span className="chat-freq">140.85</span>
                        </span>
                        <button
                            type="button"
                            className="icon-button"
                            onClick={() => setOpen(false)}
                            aria-label="Close chat"
                        >
                            <span aria-hidden="true">×</span>
                        </button>
                    </header>

                    {messages.length > 0 ? (
                        <ul className="chat-log">
                            {messages.map((message) => (
                                <li key={message.id} className="chat-msg">
                                    <span className="chat-role">{message.role}</span>
                                    <span
                                        className={
                                            message.role === 'you'
                                                ? 'chat-msg-user'
                                                : 'chat-msg-bot'
                                        }
                                    >
                                        {message.text}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : null}

                    <form className="chat-form" onSubmit={onSubmit}>
                        <span className="chat-prompt" aria-hidden="true">
                            &gt;
                        </span>
                        <input
                            className="chat-input"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            disabled={!chatEnabled || pending}
                            placeholder={
                                chatEnabled ? 'Ask about my work…' : 'Not wired up yet'
                            }
                            aria-label="Ask a question about my work"
                        />
                        <button
                            type="submit"
                            className="chat-send"
                            disabled={!chatEnabled || pending || !draft.trim()}
                        >
                            {pending ? '…' : 'send'}
                        </button>
                    </form>

                    {!chatEnabled ? (
                        <p className="chat-note">
                            A retrieval-augmented chatbot over my work history. The
                            backend isn't built yet.
                        </p>
                    ) : null}

                    {error ? (
                        <p className="chat-error" role="status">
                            {error}
                        </p>
                    ) : null}
                </section>
            ) : null}

            <button
                type="button"
                className="chat-fab codec-frame"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={open ? 'Close codec' : 'Open codec'}
            >
                <span>{open ? 'close' : 'talk with a chatbot'}</span>
                {open ? null : (
                    <span className="chat-cursor" aria-hidden="true">
                        ▮
                    </span>
                )}
            </button>
        </div>
    )
}
