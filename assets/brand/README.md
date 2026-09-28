# Identidade final oficial — Meus Mapas

A partir da **V13.1.0**, a fonte visual oficial da marca é exclusivamente o kit final fornecido pelo usuário em PNG.

A identidade é **preto + branco + off-white + grafite**. O mascote oficial é o fantasma leitor, e a assinatura da logo horizontal é **ESTUDO INTELIGENTE**.

A identidade coral anterior não é mais fonte visual da marca. O coral pode continuar existindo temporariamente em componentes funcionais da interface (como Simulados), sem ser tratado como cor principal da identidade.

## Masters oficiais

Os arquivos originais, sem redesenho nem recoloração, ficam em:

`assets/brand/source/final/`

| Master | Origem do pacote | Uso |
|---|---|---|
| `logo-horizontal.png` | `Logo.png` | Logo principal horizontal |
| `app-icon-master.png` | `Logo App.png` | Master do ícone do app |
| `marca-simplificada-master.png` | `Logo Simplificada.png` | Marca compacta e favicon |
| `logo-horizontal-alt.png` | `011450a1-e01e-434c-8da6-f50e6f626b49.png` | Variação horizontal preservada |
| `mascote-leitura.png` | `08_51_29-1` | Leitura |
| `mascote-livros-gorro.png` | `08_51_31-2` | Livros / inverno |
| `mascote-marcacao.png` | `08_51_32-3` | Marcação / ação |
| `mascote-livros-feliz.png` | `08_51_33-4` | Livros / conquista |
| `mascote-pensando.png` | `08_51_34-5` | Pensando / estudo |
| `mascote-notebook.png` | `08_51_36-6` | Notebook |
| `mascote-ideia.png` | `08_51_37-7` | Ideia / lâmpada |

## Runtime

- `assets/brand/logo/logo-horizontal.png` — sidebar desktop.
- `assets/brand/logo/marca-simplificada.png` — sidebar compacta e tela offline.
- `assets/brand/app-icons/icon-192.png` e `icon-512.png` — PWA.
- `assets/brand/app-icons/apple-touch-icon.png` — iOS.
- `assets/brand/app-icons/icon-maskable-192.png` e `icon-maskable-512.png` — ícones maskable com área segura e fundo `#0d0d0d`.
- `assets/brand/favicon/` — favicon baseado na marca simplificada.
- `assets/brand/social/og-image.png` — Open Graph 1200 × 630.
- `assets/brand/social/social-square.png` — social quadrado 1080 × 1080.
- `assets/brand/splash/` — splashes com fundo `#030406` e logo horizontal centralizada.
- `assets/brand/mascot/` — sete mascotes oficiais de produção.

## Regras de uso

Não redesenhar, recolorir, alterar tipografia, proporções ou reconstruir a marca via CSS. Não gerar novas variações do mascote quando uma arte oficial do kit atender ao uso.

A logo horizontal deve usar `object-fit: contain`. A marca simplificada já possui fundo escuro e não deve receber placa branca.

Os mascotes devem aparecer seletivamente em estados vazios e destaques específicos. Conteúdo primeiro; marca depois.

As capas em `assets/capas/` e `assets/capas/simulados/` possuem linguagem própria e não fazem parte desta migração.
