import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // explicit (matches Vite's own default, but stated rather than implicit) -
  // this is what makes `vite preview`'s static server fall back to
  // index.html for unknown paths like /vehicles, needed for client-side
  // routing to work on page refresh/direct navigation
  appType: "spa",
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
