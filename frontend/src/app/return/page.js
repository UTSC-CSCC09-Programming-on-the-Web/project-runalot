'use client';
import { useSearchParams } from "next/navigation";

export default function ReturnPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Session ID Missing</h2>
          <p className="text-gray-600 dark:text-gray-300">No session ID was provided in the URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Return Page</h2>
        <p className="text-gray-600 dark:text-gray-300">Session ID: {sessionId}</p>
      </div>
    </div>
  );
}