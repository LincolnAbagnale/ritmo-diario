// Máscara e validação de telefone no formato (55) 43 98402-3440
// (país 2 dígitos + DDD 2 dígitos + número 8-9 dígitos = 12-13 dígitos)

export const PHONE_MIN_DIGITS = 12;
export const PHONE_MAX_DIGITS = 13;

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, PHONE_MAX_DIGITS);
}

export function formatPhone(value: string): string {
  const d = phoneDigits(value);
  if (d.length === 0) return "";
  let out = `(${d.slice(0, 2)}`;
  if (d.length >= 2) out += `) ${d.slice(2, 4)}`;
  else return out;
  if (d.length > 4) {
    const mobile = d.length > PHONE_MIN_DIGITS; // 13 dígitos → número com 9 dígitos
    const firstLen = mobile ? 5 : 4;
    const rest = d.slice(4);
    const first = rest.slice(0, firstLen);
    const last = rest.slice(firstLen);
    out += ` ${first}`;
    if (last.length > 0) out += `-${last}`;
  }
  return out;
}

export function isValidPhone(value: string): boolean {
  const len = phoneDigits(value).length;
  return len >= PHONE_MIN_DIGITS && len <= PHONE_MAX_DIGITS;
}
