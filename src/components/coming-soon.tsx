export function ComingSoon({ platform }: { platform: "handshake" | "snorkel" }) {
  const name = platform === "handshake" ? "Handshake" : "Snorkel";
  return (
    <div className="mx-auto max-w-lg pt-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{name}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{name} is next</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {name} will use its own accounts, projects, and tasks, because those fields differ from DA. The same sidebar will
        apply once that workspace is open. Switch back to DA to keep working.
      </p>
    </div>
  );
}
