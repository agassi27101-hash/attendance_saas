const TOKEN_KEY = 'hr_auth_token';
const USER_KEY = 'hr_user_info';

export interface HRUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function deleteToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function saveUser(user: HRUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): HRUser | null {
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}
