'use client';

export default function ChatIdError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <h2 className="text-xl font-semibold text-red-600">Failed to load chat</h2>
      <p className="mt-2 text-gray-600">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
      >
        Try again
      </button>
    </div>
  );
}
