import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量 - 包括 REACT_APP_ 前缀
  const env = loadEnv(mode, process.cwd(), ['REACT_APP_', 'VITE_']);
  
  return {
  // 确保环境变量在 import.meta.env 中可用
  envPrefix: ['REACT_APP_', 'VITE_'],
  server: {
    host: "::",
    port: 8080,
    watch: {
      usePolling: true,
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Configure polyfills for specific modules
      include: [
        'crypto',
        'stream',
        'assert',
        'http',
        'https',
        'os',
        'url',
        'path',
        'util',
        'buffer',
        'process',
      ],
    }),
    mode === 'development'
  ].filter(Boolean) as any[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // 添加更多 polyfill 别名，匹配 frontend-nugget 的配置
      "crypto": "crypto-browserify",
      "stream": "stream-browserify",
      "http": "stream-http",
      "https": "https-browserify",
      "os": "os-browserify",
      "url": "url",
      "path": "path-browserify",
      "util": "util",
      "buffer": "buffer",
      "process": "process/browser",
    },
  },
  define: {
    global: 'globalThis',
    // 确保 Buffer 在全局可用
    Buffer: 'Buffer',
    // 确保 process 在全局可用
    process: 'process',
    'process.env': {
      NODE_ENV: JSON.stringify(mode),
      // zkwasm-minirollup-browser expects REACT_APP_ prefix - 全部从 .env 读取
      REACT_APP_CHAIN_ID: JSON.stringify(env.REACT_APP_CHAIN_ID),
      REACT_APP_CHAIN_NAME: JSON.stringify(env.REACT_APP_CHAIN_NAME),
      REACT_APP_RPC_URL: JSON.stringify(env.REACT_APP_RPC_URL),
      REACT_APP_DEPOSIT_CONTRACT: JSON.stringify(env.REACT_APP_DEPOSIT_CONTRACT),
      REACT_APP_TOKEN_CONTRACT: JSON.stringify(env.REACT_APP_TOKEN_CONTRACT),
      REACT_APP_WALLETCONNECT_PROJECT_ID: JSON.stringify(env.REACT_APP_WALLETCONNECT_PROJECT_ID),
      // 保留VITE_前缀的环境变量用于我们自己的代码
      VITE_ZKWASM_RPC_URL: JSON.stringify(env.VITE_ZKWASM_RPC_URL),
      VITE_ZKWASM_APP_NAME: JSON.stringify(env.VITE_ZKWASM_APP_NAME),
    },
  },
  optimizeDeps: {
    include: [
      'zkwasm-minirollup-browser',
      'zkwasm-minirollup-rpc', 
      'zkwasm-service-helper',
      'buffer',
      'process',
      'crypto-browserify',
      'stream-browserify',
      'stream-http',
      'https-browserify',
      'os-browserify',
      'url',
      'util',
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
    rollupOptions: {
      external: [],
      output: {
        globals: {
          global: 'globalThis',
        },
      },
    },
  },
};
});