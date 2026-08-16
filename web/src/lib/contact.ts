const API = import.meta.env.VITE_CONTACT_API_URL

export const contactEnabled = Boolean(API)

export type Draft = {
    name: string
    email: string
    message: string
}

/** Sends a message to an address the browser never learns. */
export async function sendMessage(draft: Draft, token: string): Promise<void> {
    if (!API) throw new Error('contact api is not configured')

    const response = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...draft, token }),
    })

    // The gate fails closed, so a refusal can mean Cloudflare is down rather than
    // that the visitor did anything wrong. Point at a route that still works.
    if (response.status === 403) {
        throw new Error('That check did not pass. Try again, or reach me on LinkedIn.')
    }
    if (!response.ok) throw new Error(`Something went wrong (${response.status}).`)
}
