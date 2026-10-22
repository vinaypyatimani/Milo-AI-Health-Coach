"""Thin wrapper around LiteLLM so every provider is called the same way.

Swapping models (OpenAI, GitHub Models, Ollama, Gemini, Claude, ...) only
needs a different model string in .env; no code changes.
"""
from __future__ import annotations

import re
import time
from typing import Callable, Iterator

from . import config
from .pricing import make_usage, rough_tokens

Message = dict  # {"role": "system" | "user" | "assistant", "content": str}

# Tests (and the offline demo) can replace the real call with a fake one.
_override: Callable[[list[Message], str, float], str] | None = None


def set_override(fn: Callable[[list[Message], str, float], str] | None) -> None:
    global _override
    _override = fn


class LLMError(RuntimeError):
    pass


def is_reasoning_model(model: str) -> bool:
    """GPT-5 and GPT-6 models think before answering. They take a
    reasoning_effort setting, and only accept temperature when reasoning is off."""
    name = model.split("/")[-1].lower()
    return name.startswith(("gpt-5", "gpt-6"))


def build_params(model: str, temperature: float) -> dict:
    params: dict = {"model": model}
    if is_reasoning_model(model):
        effort = config.REASONING_EFFORT
        params["reasoning_effort"] = effort
        if effort == "none":  # temperature only applies with reasoning off
            params["temperature"] = temperature
    else:
        params["temperature"] = temperature
    return params


def _estimate(messages: list[Message], reply: str) -> tuple[int, int]:
    return rough_tokens("".join(m["content"] for m in messages)), rough_tokens(reply)


def _record(usage: dict | None, model: str, inp: int, out: int, estimated: bool) -> None:
    if usage is not None:
        usage.clear()
        usage.update(make_usage(model, inp, out, estimated))


def chat(messages: list[Message], model: str | None = None,
         temperature: float | None = None, retries: int = 3,
         usage: dict | None = None) -> str:
    """One model call. Pass a dict as `usage` to receive tokens and cost."""
    model = model or config.MILO_MODEL
    temperature = config.TEMPERATURE if temperature is None else temperature

    if _override is not None:
        reply = _override(messages, model, temperature)
        _record(usage, model, *_estimate(messages, reply), estimated=True)
        return reply

    import litellm  # imported lazily: it is slow to import

    params = build_params(model, temperature)
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            response = litellm.completion(messages=messages, **params)
            reply = response.choices[0].message.content or ""
            u = getattr(response, "usage", None)
            if u and getattr(u, "prompt_tokens", None) is not None:
                _record(usage, model, u.prompt_tokens, u.completion_tokens or 0, estimated=False)
            else:
                _record(usage, model, *_estimate(messages, reply), estimated=True)
            return reply
        except (litellm.AuthenticationError, litellm.BadRequestError, litellm.NotFoundError) as e:
            # Wrong key, unsupported parameter or unknown model: retrying won't help.
            raise LLMError(f"{model}: {e}") from e
        except litellm.RateLimitError as e:  # free tiers hit this often
            last_error = e
            time.sleep(2 ** attempt * 5)
        except Exception as e:  # noqa: BLE001 - network or provider hiccup
            last_error = e
            time.sleep(2 ** attempt)
    raise LLMError(f"Model call failed after {retries} attempts: {last_error}")


def chat_stream(messages: list[Message], model: str | None = None,
                temperature: float | None = None, retries: int = 3,
                usage: dict | None = None) -> Iterator[str]:
    """Like chat(), but yields the reply in small pieces as the model writes it.

    The user sees the first words after a second or two instead of waiting for
    the whole answer. Retries only happen before the first piece arrives;
    after that, restarting would repeat text the user has already seen.
    """
    model = model or config.MILO_MODEL
    temperature = config.TEMPERATURE if temperature is None else temperature

    if _override is not None:  # tests: stream the fake reply word by word
        reply = _override(messages, model, temperature)
        yield from re.findall(r"\S+\s*|\s+", reply)
        _record(usage, model, *_estimate(messages, reply), estimated=True)
        return

    import litellm

    params = build_params(model, temperature)
    last_error: Exception | None = None
    for attempt in range(retries):
        started = False
        parts: list[str] = []
        reported = None
        try:
            # include_usage: the provider sends token counts in the last chunk
            for chunk in litellm.completion(messages=messages, stream=True, drop_params=True,
                                            stream_options={"include_usage": True}, **params):
                u = getattr(chunk, "usage", None)
                if u and getattr(u, "prompt_tokens", None):
                    reported = u
                choices = getattr(chunk, "choices", None) or []
                delta = getattr(choices[0].delta, "content", None) if choices else None
                if delta:
                    started = True
                    parts.append(delta)
                    yield delta
            if reported is not None:
                _record(usage, model, reported.prompt_tokens, reported.completion_tokens or 0, estimated=False)
            else:
                _record(usage, model, *_estimate(messages, "".join(parts)), estimated=True)
            return
        except (litellm.AuthenticationError, litellm.BadRequestError, litellm.NotFoundError) as e:
            raise LLMError(f"{model}: {e}") from e
        except Exception as e:  # noqa: BLE001
            if started:
                raise LLMError(f"The reply was interrupted: {e}") from e
            last_error = e
            wait = 2 ** attempt * (5 if isinstance(e, litellm.RateLimitError) else 1)
            time.sleep(wait)
    raise LLMError(f"Model call failed after {retries} attempts: {last_error}")
