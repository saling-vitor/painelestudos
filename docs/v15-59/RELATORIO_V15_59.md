# V15.59 · Ponte com a Template V211 G27

- **Mapa → app** (`meus-mapas/map-summary/v1`): o leitor aceita `MEUS_MAPAS_MAP_HELLO` e `MEUS_MAPAS_MAP_SUMMARY` só do `#readerFrame`, mesma origem. O resumo é reduzido (sem anotações, enunciados ou alternativas) e fica neste aparelho em `studyapp.mapSummary::<mapKey>`, como o estado do mapa.
- **App → mapa** (`meus-mapas/context/v1`): em resposta ao HELLO, o app envia curso (sigla, banca, cargo, data e fase da prova), disciplina (nome, peso, mínimo, pontos por tópico), alcance e até três motivos do plano ligados a peso, mínimo ou domínio.
- **Progresso**: com resumo G27, os erros por armadilha somam o que o mapa já classifica (Raio-X por tópico e alternativas erradas do Teste-se, na taxonomia única); sem resumo, continua lendo `v135.errorPatterns`.
- **Planejamento do kit REV07**: `mapas[{sigla, disciplinas, alcance}]` define a disciplina principal (`mapaDisciplina`, vale antes da categoria) e o alcance de cada mapa.
- Mapas G26 continuam iguais no app.

Testes: `tests/e2e/ponte-template-v15-59.spec.mjs`.
