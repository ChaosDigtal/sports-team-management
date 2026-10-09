"use client";

export default function ConsoleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-lg rounded-lg border border-line bg-white px-5 py-6">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm leading-6 text-muted">The page could not be loaded. Try it again.</p>
      <button type="button" onClick={reset} className="mt-4 text-sm font-medium text-accent">
        Try again
      </button>
    </div>
  );
}
