export function passwordError(password: string, confirmation: string): string | null {
  if (password.length < 8) return "La password deve contenere almeno 8 caratteri.";
  if (password !== confirmation) return "Le password non coincidono.";
  return null;
}