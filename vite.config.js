import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: 'content.js',
        background: 'background.js'
      },
      output: {
        // Output exactly as content.js and background.js without hash
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  plugins: [
    {
      name: 'copy-assets',
      closeBundle() {
        copyFileSync('manifest.json', 'dist/manifest.json');
        copyFileSync('welcome.html', 'dist/welcome.html');
        console.log('✅ Copied manifest.json and welcome.html to dist/');
      }
    }
  ]
});
