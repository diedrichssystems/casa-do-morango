import { defineConfig, loadEnv } from 'vite';

// Endereço público do site (ex.: https://casadomorango.com.br), sem barra no fim.
// Defina SITE_URL na hospedagem (ou num arquivo .env) antes do build: ele completa o link canônico,
// a imagem de compartilhamento (prévia no WhatsApp/Instagram) e gera o sitemap.xml.
// Sem SITE_URL o site funciona igual, só que essas três coisas ficam com endereço relativo / sem sitemap.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const site = (env.SITE_URL || '').replace(/\/+$/, '');
  return {
    server: { port: 5191, host: true }, // host: abre também na rede (celular no mesmo Wi-Fi)
    plugins: [{
      name: 'endereco-do-site',
      // "pre": troca antes de o Vite ler os links do HTML (senão ele estranha o %SITE_URL%)
      transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE_URL%', site) },
      generateBundle() {
        const hoje = new Date().toISOString().slice(0, 10);
        const robots = site ? `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n` : 'User-agent: *\nAllow: /\n';
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
        if (site) {
          this.emitFile({
            type: 'asset', fileName: 'sitemap.xml',
            source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc><lastmod>${hoje}</lastmod></url>\n</urlset>\n`,
          });
        }
      },
    }],
  };
});
