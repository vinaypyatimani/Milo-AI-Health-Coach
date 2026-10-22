"""Token prices, to show what each conversation costs.

Prices come from LiteLLM's built-in price list when it knows the model, with
a small fallback table. GitHub Models (free tier) and local Ollama models cost
nothing. Set MILO_PRICE_INPUT / MILO_PRICE_OUTPUT (USD per 1M tokens) to
override, e.g. if your provider's prices change.
"""
from __future__ import annotations

import os
from typing import Optional

# USD per 1M tokens (input, output). Used only if LiteLLM doesn't know the model.
FALLBACK = {
    "gpt-6-luna": (0.10, 0.50),
    "gpt-6-sol": (2.00, 10.00),
}
FREE_PROVIDERS = ("github/", "ollama/")


def price_per_million(model: str) -> Optional[tuple[float, float]]:
    env_in, env_out = os.getenv("MILO_PRICE_INPUT"), os.getenv("MILO_PRICE_OUTPUT")
    if env_in and env_out:
        return float(env_in), float(env_out)
    if model.startswith(FREE_PROVIDERS):
        return 0.0, 0.0
    name = model.split("/")[-1]
    try:
        import litellm

        info = litellm.model_cost.get(name) or litellm.model_cost.get(model)
        if info and info.get("input_cost_per_token") is not None:
            return info["input_cost_per_token"] * 1e6, info.get("output_cost_per_token", 0) * 1e6
    except Exception:  # noqa: BLE001 - prices are a nice-to-have
        pass
    return FALLBACK.get(name)


def cost_usd(model: str, input_tokens: int, output_tokens: int) -> Optional[float]:
    p = price_per_million(model)
    if p is None:
        return None
    return round((input_tokens * p[0] + output_tokens * p[1]) / 1e6, 6)


def make_usage(model: str, input_tokens: int, output_tokens: int, estimated: bool) -> dict:
    return {
        "model": model,
        "input_tokens": int(input_tokens),
        "output_tokens": int(output_tokens),
        "cost_usd": cost_usd(model, input_tokens, output_tokens),
        "estimated": estimated,
    }


def add_usage(a: Optional[dict], b: Optional[dict]) -> Optional[dict]:
    """Sum two usage records (e.g. the reply and a plan repair call)."""
    if not a:
        return b
    if not b:
        return a
    cost = None if a["cost_usd"] is None or b["cost_usd"] is None else round(a["cost_usd"] + b["cost_usd"], 6)
    return {"model": a["model"], "input_tokens": a["input_tokens"] + b["input_tokens"],
            "output_tokens": a["output_tokens"] + b["output_tokens"], "cost_usd": cost,
            "estimated": a["estimated"] or b["estimated"]}


def rough_tokens(text: str) -> int:
    """About 4 characters per token: only used when the provider reports no usage."""
    return max(1, len(text) // 4)
