import { defineConfig } from 'vite';

// OneDrive's Windows filesystem filter can deny Node's native realpath call.
// Preserve the project path so Vite can resolve source files without that call.
export default defineConfig({
  resolve: {
    preserveSymlinks: true,
  },
});
