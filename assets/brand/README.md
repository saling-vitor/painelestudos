# MEUS MAPAS — Kit de marca final

Este pacote foi gerado a partir da **prancha final aprovada** fornecida em 27/09/2026. A prancha original está em `source/identity-final-board.png` e os elementos auxiliares da própria prancha (rótulos, paleta, divisórias e fundo) **não fazem parte dos logos entregues**.

## Masters

- `source/logo-horizontal-master.png` — lockup oficial com mascote, “MEUS MAPAS” e “ESTUDO INTELIGENTE”, fundo transparente.
- `source/logo-sem-slogan-master.png` — lockup oficial sem slogan, fundo transparente.
- `source/mascote-master.png` — mascote isolado em alta resolução e com transparência.
- `source/marca-simplificada-master.png` — versão reduzida isolada, com transparência.
- `source/app-icon-master.png` — master **1024×1024 px** do ícone aprovado do app.

> A fonte aprovada é raster. Os masters preservam o desenho visível da prancha e foram ampliados uma única vez com Lanczos; não foi redesenhado nem reinterpretado nenhum elemento.

## Qual arquivo usar

| Situação | Arquivo |
|---|---|
| Cabeçalho / site em fundo escuro | `logo/logo-horizontal.png` |
| Logo completo | `logo/logo-principal.png` |
| Cabeçalho compacto | `logo/logo-sem-slogan.png` |
| Fundo claro | `logo/logo-para-fundo-claro-placa-escura.png` (mantém a paleta oficial sem recolorir a marca) |
| Mascote isolado | `mascot/mascote.png` |
| Marca reduzida | `logo/marca-simplificada.png` |
| Ícone principal PWA | `app-icons/icon-192.png` e `app-icons/icon-512.png` |
| Android maskable | `app-icons/icon-maskable-192.png` e `icon-maskable-512.png` |
| iPhone/iPad | `app-icons/apple-touch-icon.png` |
| Favicon | `favicon/favicon.ico` ou PNGs específicos |
| Open Graph / link compartilhado | `social/og-image.png` |
| Perfil / avatar | `social/social-profile.png` |
| Splash | arquivos em `splash/` |

## Integração PWA

O `manifest.webmanifest` da raiz preserva as configurações atuais do projeto (nome, descrição, `start_url`, `scope`, `display`, orientação, `background_color` e `theme_color`) e troca apenas as referências de ícones para `assets/brand/app-icons/`.

Use `html-head-snippet.html` para favicon, Apple Touch Icon, manifest, Open Graph e Twitter Card. O projeto atual ainda referencia `assets/icons/...` em `index.html` e no array `OPTIONAL` do `sw.js`; veja `integration/` para as substituições pontuais sem mexer no restante do PWA.

## Regeneração

Na raiz do projeto:

```bash
python tools/generate-brand-assets.py
```

Requisito: `Pillow`. O script sempre redimensiona a partir dos masters, nunca em cadeia a partir de ícones menores.

## Paleta aprovada

- Preto: `#121314`
- Creme: `#FFF7E6`
- Amarelo: `#F4C95D`
- Bege: `#E9D7B3`
- Dourado: `#C9A574`
- Marrom: `#3A342B`

O `theme-color` do PWA permanece `#030406` porque esse é o valor já utilizado no projeto atual e foi preservado por segurança de integração.
