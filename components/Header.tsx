type HeaderProps = {
  status: "idle" | "uploading" | "polling" | "preparing" | "success" | "error";
};

export default function Header({ status }: HeaderProps) {
  const state = status === "error" ? "Error" : status === "success" ? "Model ready" : status === "idle" ? "Local mode" : "Processing";
  return (
    <header className="glass-card flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-soft">Interior asset workflow</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">pic to 3D</h1>
      </div>
      <span className={`status-pill status-${status}`}><i aria-hidden="true" />{state}</span>
    </header>
  );
}
