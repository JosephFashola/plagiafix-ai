import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Ensure API_KEY is available in the client build
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || '')
    },
    server: {
      port: 8080,
      host: true
    },
    preview: {
      port: 8080,
      host: true,
      allowedHosts: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});