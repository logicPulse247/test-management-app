import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": "/src",
    },
  },

  server: {
    proxy: {
      "/api": {
        target: "https://admin-moderator-backend-staging.up.railway.app",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});