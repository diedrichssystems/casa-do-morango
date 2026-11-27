# Site da Casa do Morango

Site de uma página (Vite + GSAP + Lenis), com catálogo, pedido pelo WhatsApp e Política de Privacidade.
Feito pela Diedrichs Systems.

## Publicar

Precisa de Node.js 18 ou mais novo.

| Configuração | Valor |
|---|---|
| Comando de build | `npm run build` |
| Pasta publicada | `dist` |
| Variável de ambiente | `SITE_URL` = endereço final do site, sem barra no fim (ex.: `https://casadomorango.com.br`) |

A `SITE_URL` completa o link canônico, a imagem de prévia ao compartilhar o link (WhatsApp, Instagram, Facebook) e gera o `sitemap.xml`. Sem ela o site funciona, mas a prévia do link pode não aparecer.

### Netlify ou Cloudflare Pages

1. Importe este repositório (`diedrichssystems/casa-do-morango`, ramo `main`).
2. Use o comando e a pasta da tabela acima e crie a variável `SITE_URL`.
3. Publique e ligue o domínio.

Os arquivos `public/_redirects` e `public/_headers` já funcionam nesses dois:
- `/whatsapp` e `/instagram` são atalhos que redirecionam para o WhatsApp e o Instagram da loja;
- os arquivos de `/assets` ficam em cache por 1 ano (o nome deles muda a cada build).

### Vercel

Mesmo comando, mesma pasta e mesma variável. A Vercel ignora `_redirects` e `_headers`; o site funciona igual, só sem os atalhos `/whatsapp` e `/instagram`.

### Hospedagem comum (cPanel, FTP)

Rode na sua máquina:

```bash
npm install
SITE_URL=https://casadomorango.com.br npm run build
```

No Windows (PowerShell): `$env:SITE_URL="https://casadomorango.com.br"; npm run build`

Depois envie **o conteúdo** da pasta `dist` para a pasta pública do domínio (`public_html`).

## Rodar no computador

```bash
npm install
npm run dev       # http://localhost:5191 (também abre no celular pelo IP da máquina, no mesmo Wi-Fi)
npm run preview   # versão final, depois do npm run build
```

## Antes de publicar

- **Política de Privacidade** (rodapé → "Política de privacidade"): o dono da loja precisa confirmar se faz entrega, se não manda promoções sem a pessoa pedir e por quanto tempo guarda as conversas; se quiser, incluir CNPJ e razão social. O texto está em `index.html`, no bloco `id="privacidade"`.
- **WhatsApp**: todos os botões usam o número (63) 99259-4750 (`5563992594750`).
- Depois de publicar, cadastrar o site no Google Search Console com o `sitemap.xml`.

## Onde mexer

- Textos e produtos do catálogo: `index.html` (cada produto é um `<li class="item">`).
- Cores, espaçamentos e celular: `src/styles.css`.
- Animações (abertura, cortina, catálogo e pedido): `src/main.js`.
- Fotos: `public/img` (sempre em `.webp` leve; os produtos ficam em `public/img/catalogo`).
