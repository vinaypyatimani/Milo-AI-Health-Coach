from __future__ import annotations

import time
from typing import Callable
from .import config

Message = dict

# Tests replace the real model with a fake one (offline, free, predictable).
_override: Callable[[list[Message], str, float], str] | None = None


def set_override(fn):
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

def chat(messages: list[Message], model: str | None=None,
         temperature: float | None=None, retries: int = 3) -> str:
    model = model or config.MILO_MODEL
    temperature = config.TEMPERATURE if temperature is None else temperature

    if _override is not None:
        return _override(messages, model, temperature)

    import litellm  # imported here because it takes a few seconds to load

    params = build_params(model, temperature)
    last_error = None

    for attempt in range(retries):
        try:
            response = litellm.completion(messages=messages, **params)
            return response.choices[0].message.content or ""
        except (litellm.AuthenticationError, litellm.BadRequestError, litellm.NotFoundError) as e:
            # Wrong key, unsupported parameter or unknown model: retrying won't help.
            raise LLMError(f"{model}: {e}") from e
        except litellm.RateLimitError as e:  # free tiers hit this often
            last_error = e
            time.sleep(2 ** attempt * 5)     # wait 5 s, 10 s, 20 s
        except Exception as e:  # network or provider hiccup
            last_error = e
            time.sleep(2 ** attempt)
    raise LLMError(f"Model call failed after {retries} attempts: {last_error}")