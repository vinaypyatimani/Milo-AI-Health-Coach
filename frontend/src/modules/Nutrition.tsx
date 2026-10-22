import type { Meal, NutritionPlan } from "../lib/types";

function Meals({ title, meals }: { title: string; meals: Meal[] }) {
  if (!meals.length) return null;
  return (
    <div className="meals">
      <h3>{title}</h3>
      <dl>
        {meals.map((m) => (
          <div key={m.meal + m.timing}>
            <dt>{m.meal}{m.timing && <span className="muted small"> · {m.timing}</span>}</dt>
            <dd>{m.suggestion}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The nutrition part of the plan (only there if you said yes when Milo asked). */
export function NutritionView({ n }: { n: NutritionPlan }) {
  return (
    <div className="nutrition">
      {n.summary && <p>{n.summary}</p>}
      {n.principles.length > 0 && <ul className="principles">{n.principles.map((p) => <li key={p}>{p}</li>)}</ul>}
      <div className="meal-cols">
        <Meals title="Training days" meals={n.training_day} />
        <Meals title="Rest days" meals={n.rest_day} />
      </div>
      {n.hydration && <p><strong>Hydration.</strong> {n.hydration}</p>}
      {n.notes && <p className="muted small">{n.notes}</p>}
    </div>
  );
}
