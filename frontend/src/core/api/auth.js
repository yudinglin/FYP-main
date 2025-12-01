import { apiRequest } from "./client.js";

export async function login(email, password) {
  const res = await apiRequest("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (res.ok && res.data) {
    const { token, user } = res.data;
    if (token) localStorage.setItem("ya_token", token);
    if (user) localStorage.setItem("ya_user", JSON.stringify(user));
  }
  return user;
}

export async function register(email, password, username) {
  const res = await apiRequest("/api/register", {
    method: "POST",
    body: JSON.stringify({ email, password, username }),
  });
  return res;
}

export function logout() {
  localStorage.removeItem("ya_token");
  localStorage.removeItem("ya_user");
}
