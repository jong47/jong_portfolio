import httpx

SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
TIMEOUT = 5.0


async def passed(token: str | None, remote_ip: str | None, secret: str) -> bool:
    """
    Fail closed. This gate used to guard a value the visitor was going to be handed
    anyway, so an outage on Cloudflare's side was not worth blocking anyone over.
    It now guards an inbox, and drive-by form spam is exactly the automated traffic
    the check exists to stop — serving through an outage reopens the hole.

    The visitor is not stranded: the resume is a static asset and the profile links
    are unguarded, so there is another way to reach a human either way.
    """
    if not token:
        return False

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                SITEVERIFY,
                json={"secret": secret, "response": token, "remoteip": remote_ip},
            )

        return response.json().get("success") is True
    except (httpx.HTTPError, ValueError):
        return False
