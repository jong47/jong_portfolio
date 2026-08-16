const ENDPOINT = import.meta.env.VITE_CHAT_API_URL

export const chatEnabled = Boolean(ENDPOINT)

export async function sendMessage(
    message: string,
    signal?: AbortSignal,
): Promise<string> {
    if (!ENDPOINT) throw new Error('Chat endpoint is not configured.')

    const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal,
    })

    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`)
    }

    const data: unknown = await response.json()
    if (typeof data === 'object' && data !== null && 'reply' in data) {
        const { reply } = data as { reply: unknown }
        if (typeof reply === 'string') return reply
    }

    throw new Error('Unexpected response shape.')
}
