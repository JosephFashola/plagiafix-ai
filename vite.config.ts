
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Ensure API_KEY and PAYSTACK_PUBLIC_KEY are available in the client build
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || ''),
      'process.env.PAYSTACK_PUBLIC_KEY': JSON.stringify(process.env.PAYSTACK_PUBLIC_KEY || env.PAYSTACK_PUBLIC_KEY || '')
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
