import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: { port: 5173, host: true },
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'], legalComments: 'none' } : undefined,
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts';
          if (/react-markdown|remark|rehype|micromark|mdast|hast|unified|vfile/.test(id)) return 'vendor-markdown';
          if (id.includes('react-icons')) return 'vendor-icons';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/.test(id)) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
}));
