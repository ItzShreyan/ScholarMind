export const hostOwnerEmail = "shreyanmadi@gmail.com";

export function isHostOwner(email?: string | null) {
  return (email || "").trim().toLowerCase() === hostOwnerEmail;
}
