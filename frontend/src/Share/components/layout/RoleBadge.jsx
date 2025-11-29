export default function RoleBadge({ role }) {
  if (!role) return null;
  const color =
    role === "admin"
      ? "bg-purple-100 text-purple-700"
      : role === "business"
      ? "bg-blue-100 text-blue-700"
      : "bg-green-100 text-green-700";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}
    >
      {role}
    </span>
  );
}
