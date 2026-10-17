# MEUS MAPAS V15.52.0-G · como aplicar

Base: `main` no commit `c003b8c` (V15.51.0-G). Esta versão foi publicada pelo próprio fluxo do repositório (PR com CI verde e merge na `main`); os ZIPs servem de cópia e de referência.

- `MEUS_MAPAS_V15.52.0-G_COMPLETO.zip` — o projeto inteiro, final (inclui `package-lock.json`, agora versionado para o `npm ci` do CI).
- `MEUS_MAPAS_V15.52.0-G_ATUALIZACAO.zip` — só o que é novo ou mudou em relação a `c003b8c`, com `ALTERADOS.txt`, `ADICIONADOS.txt`, `EXCLUIDOS.txt` (vazio nesta versão) e `SHA256SUMS.txt`.

Nenhum dos dois contém `node_modules`, `.git` nem `data/search-index.json` (gerado pelo CI em toda publicação).

## Se precisar aplicar à mão

1. Backup da `main` (ZIP do GitHub ou branch `backup-v15-51`).
2. Opção A: apague tudo menos `.git` e copie o conteúdo do pacote completo. Opção B: copie a pasta `arquivos/` do pacote de atualização por cima do repositório e confira com `sha256sum -c SHA256SUMS.txt` dentro da pasta extraída.
3. Localmente (opcional): `npm ci`, `node scripts/build-search-index.mjs`, `node scripts/validate-release.mjs`, `npx playwright test --project=desktop-chromium`.
4. Publique por PR; o deploy só acontece com todas as suítes verdes.

## O que muda para quem já usa o app instalado

- A primeira abertura online depois da publicação ainda baixa a biblioteca uma vez (quem atende é o Service Worker antigo). A partir da seguinte, as atualizações baixam só o app (~2,5 MB) e reaproveitam mapas, capas e fontes já guardados.
- Nenhum dado local, progresso, nota, revisão, simulado, backup ou sessão é apagado. Chaves novas no aparelho: `studyapp.resume.v1` (último tópico por mapa) e, só durante uma revisão guiada, `studyapp.guidedReview.v1` na sessão.
- Quem usava a interface clássica continua nela e tem o botão "Voltar à interface em pranchas"; a opção de entrar na clássica saiu das Configurações.

## Rollback

`git revert <commit da V15.52>` e push: o CI republica a V15.51. Os dados do usuário não são afetados; o cache `study-content-v1` simplesmente deixa de ser usado pela versão antiga.
