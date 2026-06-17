const fallbackAdminEmail = "abdullah.moath@flora.com";

export function getAllowedAdminEmail() {
  return (process.env.ADMIN_ALLOWED_EMAIL || fallbackAdminEmail).trim().toLowerCase();
}

export function isAllowedAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return email.trim().toLowerCase() === getAllowedAdminEmail();
}
