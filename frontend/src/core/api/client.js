const API_BASE = "http://localhost:5000"; 
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
    return { ok: false, status: res.status, error: data?.message || "" };
  }

  return { ok: true, status: res.status, data };
}
