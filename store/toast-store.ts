import { create } from "zustand";

export type ToastTone = "success" | "error";

type ToastItem = { id: number; message: string; tone: ToastTone };

type ToastStore = {
  toasts: ToastItem[];
  pushToast: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  pushToast: (message, tone = "success") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    window.setTimeout(() => {
      get().dismiss(id);
    }, 3400);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
