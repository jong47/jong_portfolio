import httpx
import pytest
import respx

from portfolio_api.turnstile import SITEVERIFY, passed


async def check(reply: httpx.Response | Exception, token: str | None = "a-token") -> bool:
    with respx.mock:
        respx.post(SITEVERIFY).mock(
            side_effect=reply if isinstance(reply, Exception) else None,
            return_value=None if isinstance(reply, Exception) else reply,
        )
        return await passed(token, "203.0.113.1", "secret")


async def test_accepts_a_token_siteverify_approves():
    assert await check(httpx.Response(200, json={"success": True})) is True


async def test_refuses_a_token_siteverify_rejects():
    assert await check(httpx.Response(200, json={"success": False})) is False


@pytest.mark.parametrize("token", [None, ""])
async def test_refuses_when_the_widget_never_ran(token: str | None):
    assert await passed(token, None, "secret") is False


async def test_refuses_when_siteverify_is_down():
    """Guarding an inbox, not a value the visitor was getting anyway: an outage
    that let traffic through would reopen exactly the hole the check closes."""
    assert await check(httpx.Response(502, text="bad gateway")) is False


async def test_refuses_when_siteverify_is_unreachable():
    assert await check(httpx.ConnectError("network unreachable")) is False


async def test_refuses_when_siteverify_answers_with_garbage():
    """A captive portal or proxy interstitial answering 200 with html is not a pass."""
    assert await check(httpx.Response(200, text="not json")) is False
