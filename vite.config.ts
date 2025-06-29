import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      usePolling: true,
    },
  },
  plugins: [
    react(),
    mode === 'development'
  ].filter(Boolean) as any[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Node.js polyfills
      "crypto": "crypto-browserify",
      "stream": "stream-browserify",
      "http": "stream-http",
      "https": "https-browserify",
      "os": "os-browserify/browser",
      "process": "process/browser",
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {
      NODE_ENV: JSON.stringify(mode),
      // zkwasm-minirollup-browser expects REACT_APP_ prefix
      REACT_APP_CHAIN_ID: '11155111',
      REACT_APP_CHAIN_NAME: JSON.stringify('Sepolia'),
      REACT_APP_RPC_URL: JSON.stringify('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'),
      REACT_APP_DEPOSIT_CONTRACT: JSON.stringify('0x1234567890123456789012345678901234567890'),
      REACT_APP_TOKEN_CONTRACT: JSON.stringify('0x1234567890123456789012345678901234567890'),
      // 保留VITE_前缀的环境变量用于我们自己的代码
      VITE_ZKWASM_RPC_URL: JSON.stringify('https://zkwasm-explorer.delphinuslab.com:8090'),
      VITE_ZKWASM_APP_NAME: JSON.stringify('ZKWASM-PREDICTION-MARKET'),
    },
  },
  optimizeDeps: {
    include: [
      'zkwasm-minirollup-browser',
      'zkwasm-minirollup-rpc', 
      'zkwasm-service-helper',
      'process',
      'crypto-browserify',
      'stream-browserify',
      'bn.js'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    commonjsOptions: {
      include: [/bn\.js/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
}));
