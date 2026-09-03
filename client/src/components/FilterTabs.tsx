import { FILTERS, type FilterKey } from "../lib/filters";

export function FilterTabs({
  active,
  onChange,
}: {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
}) {
  return (
    <div className="filter-tabs">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          className={`ftab ${active === f.key ? "active" : ""}`}
          onClick={() => onChange(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
