import { MutedMetadata } from './ui/surface';

interface StatusMessageProps {
  message: string;
}

export function StatusMessage({ message }: StatusMessageProps) {
  return (
    <MutedMetadata className="mt-2.5 flex justify-between flex-wrap gap-2.5">
      <div>{message}</div>
    </MutedMetadata>
  );
}
