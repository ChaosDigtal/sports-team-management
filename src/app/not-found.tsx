import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">That page is not in the console</h1>
      <p className="mt-2 text-sm text-muted">The link may be old, or the record was removed.</p>
      <Link href="/dashboard" className="mt-5 text-sm font-medium text-accent">
        Back to the dashboard
      </Link>
    </div>
  );
}
