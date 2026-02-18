import { create } from "zustand";

export type Role = "editorial" | "dictaminador" | "autor";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  setAuth: (token: string, user: User) => void;
  logout: () => void;
};

const LS_TOKEN = "auth_token";
const LS_USER = "auth_user";

function loadInitial(): { token: string | null; user: User | null } {
  const token = localStorage.getItem(LS_TOKEN);
  const rawUser = localStorage.getItem(LS_USER);
  const user = rawUser ? (JSON.parse(rawUser) as User) : null;
  return { token, user };
}

export const useAuthStore = create<AuthState>((set) => {
  const { token, user } = loadInitial();

  return {
    token,
    user,
    isAuthenticated: Boolean(token),

    setAuth: (newToken, newUser) => {
      localStorage.setItem(LS_TOKEN, newToken);
      localStorage.setItem(LS_USER, JSON.stringify(newUser));
      set({ token: newToken, user: newUser, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_USER);
      set({ token: null, user: null, isAuthenticated: false });
    },
  };
});
