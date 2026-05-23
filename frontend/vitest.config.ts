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
        'src/components/base/button.tsx',
        'src/components/base/calendar.tsx',
        'src/components/base/command.tsx',
        'src/components/base/dialog.tsx',
        'src/components/base/input-group.tsx',
        'src/components/base/input.tsx',
        'src/components/base/multi-select.tsx',
        'src/components/base/popover.tsx',
        'src/components/base/textarea.tsx',
      ],
    },
  },
});
