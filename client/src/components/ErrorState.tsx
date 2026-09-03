export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-block">
      <div className="alert" role="alert">
        <p>{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Inline variant for use inside a card/form rather than as a whole-page state. */
export function InlineAlert({ message }: { message: string }) {
  return (
    <div className="alert" role="alert">
      <p>{message}</p>
    </div>
  );
}
