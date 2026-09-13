import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import wails from "@wailsio/runtime/plugins/vite";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@renderer": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: Number(process.env.WAILS_VITE_PORT) || 9245,
    strictPort: true,
  },
  // optimizeDeps: {
  //   // 显式预构建体积较大的依赖，避免 dev 起来后再触发 optimize + reload，
  //   // 期间端口短暂不可用会被 Wails 判成 "unable to connect to frontend server"
  //   include: ["vue", "vue-router", "naive-ui", "maptalks", "@wailsio/runtime"],
  // },
  plugins: [vue(), wails("./bindings")],
});
