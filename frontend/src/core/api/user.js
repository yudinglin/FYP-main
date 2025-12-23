import { apiRequest } from "./client.js";

export async function getCurrentUser() {
  const res = await apiRequest("/api/me", { method: "GET" });
  if (!res.ok) return null;
  return res.data;
}

export async function getSupportTickets() {
  const res = await apiRequest("/api/admin/support/tickets", { method: "GET" });
  if (!res.ok) return [];
  return res.data.tickets || [];
}

export async function respondToSupportTicket(ticketId, message) {
  const res = await apiRequest(`/api/admin/support/tickets/${ticketId}/respond`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  return res;
}

export async function submitReview(rating, comment) {
  const res = await apiRequest("/api/reviews", {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
  return res;
}
