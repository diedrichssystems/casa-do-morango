import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5191, host: true }, // host: abre também na rede (celular no mesmo Wi-Fi)
});
