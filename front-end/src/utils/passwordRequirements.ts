export interface PasswordRequirement {
  label: string;
  test: (pw: string) => boolean;
}

export const passwordRequirements: PasswordRequirement[] = [
  { label: 'Al menos 10 caracteres', test: (pw: string) => pw.length >= 10 },
  { label: 'Al menos 1 mayúscula', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'Al menos 1 minúscula', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'Al menos 1 número', test: (pw: string) => /[0-9]/.test(pw) },
  { label: 'Al menos 1 símbolo', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) }
];
