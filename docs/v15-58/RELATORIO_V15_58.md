# V15.58 · Peso do edital no plano e ponte com o Template

Release única com o restante dos conceitos aprovados (V15.56 Conceitos de cursos, páginas e Template de Estudos). O design e as funções existentes foram mantidos; as mudanças abaixo são acréscimos.

## Plano pelo peso da prova
- `Prancha.editais.pesoEsforco(curso)`: pontos por tópico de cada disciplina (questões × peso ÷ tópicos dos mapas ligados a ela), fatia de tópicos × fatia de pontos e cobertura.
- Prioridades (`StudyPlanner.priorityRows`) e fila de revisão ordenadas pelo peso relativo e pelo risco de mínimo da última tentativa de simulado. Domínio < 50% nas questões do mapa (≥ 5 respondidas) também sobe a prioridade, com o motivo explícito.
- Interruptor “Peso do edital no plano” em Configurações → Concursos e editais (preferência `planoPeso`).

## Curso
Peso × Esforço, placar de simulados, revisão relâmpago, reaproveitar mapas, linha do tempo dos concursos e planta medida em pontos.

## Início e Agenda
Motivos do Agora coloridos (mínimo, pontos por tópico), bloco montado pelo tempo disponível, revisão com horário fixo (bloco virtual “Revisar”), peso da semana com trocas sugeridas e semana-modelo.

## Simulados
Simulados V08 registram tempo por questão, estilo e dificuldade; o resultado mostra ritmo, acerto por disciplina × dificuldade e o treino dirigido (erradas do simulado + variantes N1–N3 dos mapas sobre os mesmos tópicos), com a armadilha classificada.

## Progresso (o que o mapa registra)
O app lê, só para leitura, o estado que o Template V211 grava no mesmo navegador (`mindmap_state::<storage-id>`): `reviewMeta[].mastery`, `quizMeta[]` e `v135.errorPatterns`.
- Nota projetada por disciplina contra os mínimos (estimativa por cobertura × 0,7 onde ainda não há questões respondidas).
- Cobertura × domínio: dominado, ilusão de domínio, só leitura, em aberto.
- Matriz pelo programa (itens do edital importados do kit; sem programa, por disciplina).
- Erros por armadilha: mapa, treinos e simulados nas 8 armadilhas da banca, com o antídoto.

## Mapas
Ordenar por pontos do edital, ficha técnica do mapa e diferenças ao atualizar o HTML (mantidos, novos, removidos, renomeados; o progresso é preservado).

## Configurações
Importar planejamento do kit (`meus-mapas/app-edital/v1`: prova, fases, programa) por curso e exportar `Cursos.csv` / `Mapas.csv` para importar como bancos de dados no Notion.

## Testes
`tests/e2e/peso-v15-58.spec.mjs` (peso × esforço, nota projetada, cobertura × domínio, armadilhas, kit e matriz, interruptor e CSV) e a suíte desktop completa.
