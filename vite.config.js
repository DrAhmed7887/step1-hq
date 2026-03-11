import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  base: "/",
  plugins: [react(), VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
    manifest: false
  }), cloudflare()]
});