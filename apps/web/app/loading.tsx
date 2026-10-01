import { Brand } from "./components/Brand";

export default function Loading() {
  return (
    <main className="workspace-loading" aria-busy="true">
      <Brand />
      <p role="status">Opening Smitten…</p>
      <div className="workspace-loading-heading" aria-hidden="true" />
      <div className="workspace-loading-cards" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => <div key={item} />)}
      </div>
    </main>
  );
}
