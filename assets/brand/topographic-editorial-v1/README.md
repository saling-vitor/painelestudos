# MEUS MAPAS — Kit de Marca Topographic Editorial V1.0

## Status
Pacote de arquivos para revisão e futura integração, produzido a partir das três artes aprovadas: símbolo isolado, logotipo horizontal e logotipo compacto.

**ATENÇÃO:** este pacote não altera o painelestudos, não faz deploy, não substitui automaticamente os mascotes de estados vazios e não muda a seleção atual de aparência do app.

## Entregáveis
- `svg/`: formas vetoriais reais (caminhos SVG), variantes com fundo preto, claro e transparente, sem fontes embutidas ou PNG incorporado.
- `png/`: exportações de alta resolução, com e sem transparência, para a marca horizontal, compacta e símbolo.
- `icons/`: ícones PWA 192/512/1024, ícones claros, maskable, Apple Touch 180, favicon 16/32/48/64 e `.ico`.
- `previews/`: prévia visual e auditoria de favicon.
- `docs/`: orientações de integração e relatório de testes.

## Guia de escolha
- **Sidebar:** `svg/compacto-dark.svg` ou `png/compacto-dark-transparente-1600px.png`.
- **Logo institucional horizontal:** `svg/horizontal-dark.svg` ou `png/horizontal-dark-transparente-2172px.png`.
- **Interface clara:** trocar `dark` por `light`.
- **PWA Android dark:** `icons/pwa-icon-192.png`, `icons/pwa-icon-512.png`.
- **PWA Apple/iPhone/iPad:** `icons/apple-touch-icon.png` (180 × 180).
- **PWA maskable:** `icons/pwa-maskable-512.png` (safe area auditada).
- **Favicon:** `svg/favicon.svg` e/ou `icons/favicon.ico` (micro-símbolo simplificado para 16–32 px, símbolo completo em 48–64 px).

## Transparência
Os SVG `*-transparente.svg` não têm retângulo de fundo; PNG `*-transparente-*.png` têm canal alfa real. Os SVG `dark`/`light` regulares possuem fundo sólido próprio.

## Vetorização e precisão
Os vetores foram reconstruídos por traçado dos pixels das artes aprovadas, com caminhos de preenchimento reais e reprodução de cor aproximada. Não são os originais vetoriais de edição da fonte (esses não foram fornecidos). Tipografia e símbolo foram preservados por traçado, sem uso de fontes distribuídas. Pode ocorrer diferença de antialiasing frente aos PNGs gerados por IA.

## Paleta do kit
- Preto: `#000000`
- Off-white: `#FAF2EA`
- Ouro: `#ECB457`
- Fundo claro: `#F8F6F1`
- Texto escuro: `#151515`
- Ouro sobre claro: `#BB8429`

## Implantação
Antes de trocar qualquer asset no projeto, confirmar a `main` mais recente e a versão técnica publicada. Avaliar os modos Desktop, iPad e iPhone instalado como PWA via WebKit. Sincronizar manifest, favicon, apple-touch-icon, caches e Service Worker apenas quando autorizado. Não eliminar mascotes existentes dos estados vazios sem decisão específica. Não presumir que PNGs já alteraram o app.
