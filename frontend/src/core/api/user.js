import { apiRequest } from "./client.js";

export async function getCurrentUser() {
  const res = await apiRequest("/api/me", { method: "GET" });
  if (!res.ok) return null;
  return res.data;
}
