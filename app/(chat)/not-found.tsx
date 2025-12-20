import Link from 'next/link';

export default function ChatNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <h2 className="text-xl font-semibold">Chat Not Found</h2>
      <p className="mt-2 text-gray-600">The chat you're looking for doesn't exist.</p>
      <Link href="/" className="mt-4 text-blue-500 hover:underline">
        Start a new chat
      </Link>
    </div>
  );
}
