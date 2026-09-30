export function CounterpartyName({
  name,
  role,
}: {
  name: string;
  role: "couple" | "vendor" | "admin";
}) {
  return (
    <div className="workspace-person-name">
      <span>{role === "couple" ? "Vendor" : "Customer"}</span>
      <strong>{name}</strong>
    </div>
  );
}
