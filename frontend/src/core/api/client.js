export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://fyp-main.onrender.com";
 
//ignore unless set revoke to admin
export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("ya_token");

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

  let data = null;
  try {
    data = await res.json();
  } catch (_) {

  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: data?.error || data?.message || "An error occurred" };
  }

  return { ok: true, status: res.status, data };
}
