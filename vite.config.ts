import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/national_day_96th/",
  envPrefix: ["VITE_", "GOOGLE_MAP_API"],
  plugins: [react()],
});
