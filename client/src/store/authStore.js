import { create } from "zustand";

const stored = localStorage.getItem("sf_user");

export const useAuthStore = create((set) => ({
  user:  stored ? JSON.parse(stored) : null,
  token: localStorage.getItem("sf_token") || null,

  login(user, token) {
    localStorage.setItem("sf_token", token);
    localStorage.setItem("sf_user", JSON.stringify(user));
    set({ user, token });
  },

  logout() {
    localStorage.removeItem("sf_token");
    localStorage.removeItem("sf_user");
    set({ user: null, token: null });
  },
}));
