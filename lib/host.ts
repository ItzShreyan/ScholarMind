const adminEmails = (process.env.ADMIN_EMAILS || "shreyanmadi@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const hostOwnerEmail = adminEmails[0] || "shreyanmadi@gmail.com";

export function isHostOwner(email?: string | null) {
  const normalized = (email || "").trim().toLowerCase();
  return adminEmails.includes(normalized);
}
