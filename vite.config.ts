import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  // Em produção a Vercel injeta SUPABASE_URL/ANON_KEY via process.env (têm
  // prioridade). Em dev, caem para um arquivo .env/.env.local na raiz, para o
  // app já abrir configurado e pular o wizard /setup.
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    fileEnv.SUPABASE_URL ??
    fileEnv.VITE_SUPABASE_URL ??
    '';
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    fileEnv.SUPABASE_ANON_KEY ??
    fileEnv.VITE_SUPABASE_ANON_KEY ??
    '';
  const explicitChannel = process.env.VITE_APP_CHANNEL ?? fileEnv.VITE_APP_CHANNEL ?? '';
  const projectName = process.env.VERCEL_PROJECT_NAME ?? fileEnv.VERCEL_PROJECT_NAME ?? '';
  const normalizedChannel = explicitChannel.trim().toLowerCase();
  const appChannel =
    normalizedChannel === 'producao' || normalizedChannel === 'production'
      ? 'producao'
      : normalizedChannel === 'espelho'
        ? 'espelho'
        : projectName === 'crm-unix'
          ? 'producao'
          : 'espelho';
  const googleMapsKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ?? fileEnv.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const cartoKey = process.env.VITE_CARTO_API_KEY ?? fileEnv.VITE_CARTO_API_KEY ?? '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_APP_CHANNEL': JSON.stringify(appChannel),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsKey),
      'import.meta.env.VITE_CARTO_API_KEY': JSON.stringify(cartoKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
    },
  };
});
