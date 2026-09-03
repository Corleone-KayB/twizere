export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}
