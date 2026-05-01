interface StatusMessageProps {
  message: string;
}

export function StatusMessage({ message }: StatusMessageProps) {
  return (
    <div className="mt-2.5 text-copy-muted text-xs flex justify-between flex-wrap gap-2.5">
      <div>{message}</div>
    </div>
  );
}
