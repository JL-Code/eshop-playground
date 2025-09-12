import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "http://localhost:8081/api-docs",
  output: "client",
  plugins: ["@hey-api/client-nuxt"],
});
