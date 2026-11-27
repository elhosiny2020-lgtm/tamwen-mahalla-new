import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/**", "data/**", "supabase/**"]),
  {
    extends: [...next],
  },
]);
