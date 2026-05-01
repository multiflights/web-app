import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/test/**',
        'src/components/ui/button.tsx',
        'src/components/ui/calendar.tsx',
        'src/components/ui/command.tsx',
        'src/components/ui/dialog.tsx',
        'src/components/ui/input-group.tsx',
        'src/components/ui/input.tsx',
        'src/components/ui/multi-select.tsx',
        'src/components/ui/popover.tsx',
        'src/components/ui/textarea.tsx',
      ],
    },
  },
});
