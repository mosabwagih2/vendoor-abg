// Bundles the background worker, the migrator, the seed and the admin tool into plain ESM files (dist-scripts/*.mjs) so the server
// runs them with `node`, without tsx, TypeScript or the Prisma CLI. Used by scripts/pack-deploy.sh.
import { build } from "esbuild";

const emptyServerOnly = {
  name: "server-only-noop",
  setup(b) {
    // The worker runs outside React; `server-only` would throw outside the react-server condition.
    b.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "noop" }));
    b.onLoad({ filter: /.*/, namespace: "noop" }, () => ({ contents: "export {}", loader: "js" }));
  },
};

await build({
  entryPoints: { worker: "scripts/worker.ts", migrate: "scripts/migrate.ts", seed: "prisma/seed/index.ts", admin: "scripts/admin.ts" },
  outdir: "dist-scripts",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  conditions: ["react-server"],
  // Native addons stay outside the bundle; the deploy bundle ships them in node_modules.
  external: ["@node-rs/argon2", "sharp"],
  plugins: [emptyServerOnly],
  // Bundled CommonJS packages call require(); give ESM output a real one.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "warning",
});
console.log("built dist-scripts/{worker,migrate,seed,admin}.mjs");
