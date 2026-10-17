# MEUS MAPAS V15.51.0-G · como aplicar

Base: `main` no commit `3134ef036553e489ca453b8ddd98299323467648` (V15.50.0-G). Se a sua `main` já estiver em outro commit, **não aplique o pacote diferencial às cegas**: compare antes (os arquivos alterados aqui podem ter mudado lá).

Há dois pacotes:

- `MEUS_MAPAS_V15.51.0-G_COMPLETO.zip` — o projeto inteiro, final;
- `MEUS_MAPAS_V15.51.0-G_ATUALIZACAO.zip` — só o que é novo ou mudou em relação ao commit base, mais as listas e este guia.

Nenhum dos dois contém `node_modules`, `.git`, `package-lock.json` nem `data/search-index.json` (este é gerado pelo CI em toda publicação, como já acontecia).

## Opção A · substituir pelo projeto completo (recomendada)

1. Faça um backup da `main` atual (baixe o ZIP do GitHub ou crie uma branch `backup-v15-50`).
2. Extraia `MEUS_MAPAS_V15.51.0-G_COMPLETO.zip` numa pasta vazia.
3. No repositório local, **apague tudo exceto a pasta `.git`** e copie o conteúdo extraído para dentro dele. Assim os 172 arquivos excluídos somem também.
4. `git status` deve mostrar 172 exclusões e 2 renomeações (`docs/supabase/…`) — o git pode agrupar algumas exclusões de CSS como renomeação para uma camada nova — e os arquivos novos/alterados de `ALTERADOS.txt` e `ADICIONADOS.txt`.
5. Antes de publicar, rode localmente (opcional, mas recomendado):
   ```
   npm install
   node scripts/build-search-index.mjs
   node scripts/validate-release.mjs
   node scripts/validate-empty-states.mjs
   node scripts/smoke-static.mjs
   npx playwright test --project=desktop-chromium
   npx playwright test --project=auditoria-plataformas
   ```
6. Commit e push quando quiser. O CI já roda validação, as quatro suítes por dispositivo e, agora, o job informativo **E2E Auditoria D/T/M** (não bloqueia o deploy).

## Opção B · aplicar só o diferencial

1. Backup da `main` (como acima).
2. Extraia `MEUS_MAPAS_V15.51.0-G_ATUALIZACAO.zip` e copie a pasta `arquivos/` **por cima** do repositório (mesmos caminhos).
3. **Apague à mão** cada caminho listado em `EXCLUIDOS.txt` — copiar um ZIP não remove arquivos. Num terminal, na raiz do repositório (troque o caminho pela pasta onde extraiu o ZIP):
   ```
   while IFS= read -r f; do [ -n "$f" ] && git rm -q -- "$f"; done < /caminho/da/extracao/EXCLUIDOS.txt
   ```
   Sem terminal: apague pelo GitHub/explorador cada arquivo da lista; são 172 arquivos + 2 movidos (174 linhas).
   (os dois arquivos movidos para `docs/supabase/` estão em `EXCLUIDOS.txt` no caminho antigo e em `ADICIONADOS.txt` no novo).
4. Confira os hashes antes de copiar: `sha256sum -c SHA256SUMS.txt`, executado dentro da pasta extraída.
5. Siga o passo 5 da opção A.

## O que muda para quem já usa o app instalado

- A versão nova troca o cache do Service Worker (`study-pwa-v15-51-0-release`); na primeira abertura online o app baixa as 14 folhas novas no lugar das 54.
- Nenhum dado local, progresso, nota, revisão, simulado, backup ou sessão é apagado ou migrado: o JavaScript do app só mudou nos identificadores de versão (state.js, updates.js, ícone do app) e as chaves de armazenamento são as mesmas.
- O manifesto ligado continua `manifest-v15.23.6.webmanifest` (e o claro `manifest-light-v15.36.2`), então o PWA instalado mantém identidade e ícone.

## Rollback

- **Antes do push:** `git checkout -- . && git clean -fd` (ou restaure o backup).
- **Depois do push:** `git revert <commit da V15.51>` e push — o CI republica a V15.50. Como a versão volta, o Service Worker da V15.50 será reinstalado na próxima abertura online; os dados do usuário não são afetados.
- Alternativa: restaurar o ZIP/branch de backup feito no passo 1.
