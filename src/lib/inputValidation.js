export function validObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

export function validText(value, maxLength) {
  if (value === null || value === undefined) return true;
  return String(value).length <= maxLength;
}

export function validMobile(value) {
  const text = String(value || "").trim();

  if (!text || text.length > 25) return false;
  if (!/^[0-9+\-()\s]+$/.test(text)) return false;

  const digits = text.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function validEmail(value) {
  if (typeof value !== "string") return false;

  const email = value.trim();

  if (!email || email.length > 254) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validPassword(value, minLength = 1) {
  if (typeof value !== "string" || value.length < minLength) {
    return false;
  }

  return new TextEncoder().encode(value).length <= 72;
}
