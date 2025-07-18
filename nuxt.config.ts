import vue from "@vitejs/plugin-vue";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  ssr: false,
  devtools: { enabled: true },
  nitro: {
    rollupConfig: {
      plugins: [vue()],
    },
  },
});
