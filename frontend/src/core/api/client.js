export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://fyp-main.onrender.com";
 
//ignore unless set revoke to admin
export async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("ya_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.error || data.message)) ||
      (typeof data === "string" && data) ||
      "Request failed";
    throw new Error(msg);
  }

  return data;
}
