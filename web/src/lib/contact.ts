const API = import.meta.env.VITE_CONTACT_API_URL

export const contactEnabled = Boolean(API)

export type Draft = {
    name: string
    email: string
    message: string
}

/** Sends a message to an address the browser never learns. */
export async function sendMessage(draft: Draft): Promise<void> {
    if (!API) throw new Error('contact api is not configured')

    const response = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
    })

    if (!response.ok) throw new Error(`Something went wrong (${response.status}).`)
}
