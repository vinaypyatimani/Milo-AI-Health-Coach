"""Chat with Milo in the terminal (Coaching Mode) to test the prompt and the model."""
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))   # so "milo" can be imported

import litellm
from milo import config
from milo.llm import chat
from milo.schemas import TrainingPlan

prompt = (Path(__file__).resolve().parent.parent / "milo" / "prompts" / "coach_system.md").read_text(encoding="utf-8")
for key, value in {"mode": "coaching", "today": date.today().isoformat(),
                   "user_profile_json": "null", "plan_json": "null",
                   "weekly_metrics_json": "null"}.items():
    prompt = prompt.replace("{{" + key + "}}", value)

messages = [{"role": "system", "content": prompt},
            {"role": "user", "content": "Hi Milo, I'd like to start a new training plan."}]

print(f"System prompt: about {litellm.token_counter(model='gpt-4o-mini', messages=messages[:1])} tokens")
print(f"Model: {config.MILO_MODEL}  (type 'quit' to stop)\n")

while True:
    reply = chat(messages)
    print(f"\nMilo: {reply}\n")
    messages.append({"role": "assistant", "content": reply})

    block = re.search(r"```json\s*(\{.*?\})\s*```", reply, re.DOTALL)
    if block:
        plan = TrainingPlan.model_validate_json(block.group(1))
        print(f"OK: valid plan with {len(plan.weeks)} weeks, starting {plan.start_date}")
        print(f"Conversation size: about {litellm.token_counter(model='gpt-4o-mini', messages=messages)} tokens")
        break

    text = input("You: ").strip()
    if text.lower() in ("quit", "exit"):
        break
    messages.append({"role": "user", "content": text})