# Pranchas · V15.49.0-G

Implantação integral das sete pranchas (Início, Cursos, Todos os Mapas, Simulados, Progresso, Agenda, Configurações) sobre o aplicativo existente. Nenhum dado de exemplo dos conceitos foi copiado: todo número exibido é calculado a partir do progresso, da agenda, das sessões, dos simulados e do histórico reais. Onde não há dado, a prancha mostra um estado vazio.

## Arquitetura

As pranchas são uma camada sobre o aplicativo, não um aplicativo paralelo.

| Arquivo | Papel |
|---|---|
| `assets/css/design-system/prancha.css` | Tokens `--pr-*` (paleta Nanquim/Grafite/Papel/Latão/Óxido/Musgo), fontes locais Archivo/Anton/IBM Plex Mono e todos os componentes com prefixo `pr-`. Carregado por último. |
| `assets/fonts/` | Fontes woff2 (OFL, via @fontsource) e licenças. Sem dependência de rede; em cache offline. |
| `prancha-data.js` | `window.Prancha`: leitura dos dados reais (cursos, mapas, revisões, agenda, sessões, simulados, dúvidas, histórico) e o armazenamento próprio `studyapp.prancha.v1`. |
| `prancha-ui.js` | Componentes (carimbo, células, veredito, planta, abas, menus), controlador de renderização, delegação de eventos, confirmação em dois toques e interface clássica. |
| `prancha-home.js` … `prancha-settings.js` | Uma página por arquivo. |
| `prancha-boot.js` | Liga a camada depois que o restante do aplicativo carregou. |

Integração: as funções de renderização existentes (`renderHome`, `renderCoursesPage`, `renderCurrentMaps`, `renderAllMaps`, `renderSimulations`, `renderProgress`, `renderStudyAgenda`, `renderSettings`) continuam rodando; o wrapper agenda um redesenho da prancha a cada chamada. A prancha é inserida como primeiro filho da `.view` e a marcação antiga da mesma view fica oculta (`.view.pr-on`). Ações usam as APIs existentes: `openMap`, `openCourse`, `StudyDashboard`, `StudyPlanner`, `StudyAutomation`, `StudyCoach`, `toggleCourseArchive`, `createRestorePoint`, `handleSimulationMenuAction`, `downloadStudyBackup` etc. O Reader V211 não foi alterado.

Configurações não recria formulários: os painéis reais (conta, rotina, planejamento, automação, backup, aplicativo, administração) são movidos para dentro das sete folhas numeradas.

## Dados novos e migração

`studyapp.prancha.v1` guarda apenas o que não existia:

- `closures` — gabarito, checklist e decisão do Pós-prova por curso;
- `cutoffs` — corte oficial, meta pessoal e estimativa por simulado (tipos distintos, nunca misturados);
- `links` — mapas compartilhados entre cursos (vínculo, sem cópia do arquivo);
- `history` — progresso diário (`marked`, `total`, `byCourse`), registrado a partir de hoje; dias anteriores não são reconstruídos;
- `agendaStarts` — horário de início dos itens de agenda já existentes (migração sem reescrever os itens; itens novos gravam `start`).

O armazenamento entra em `localPreferences` (sincronização), em `mergePreferencePayloads`/`applyPreferences` e em `buildStudyBackup`/`restoreStudyBackup` (mesclagem por padrão; substituição apenas com `replace: true`).

## Interface clássica

`Configurações → Zona de risco → Usar a interface clássica` (dois toques) grava `studyapp.prancha.off=1` e recarrega o aplicativo com as telas anteriores. O painel *Aparência* da interface clássica ganha o botão *Voltar à interface em pranchas*. A sincronização dos dados das pranchas continua ativa nos dois modos.

## Testes

- `tests/e2e/prancha.spec.mjs` cobre as sete pranchas com dados semeados, as cinco telas do Início, sessão real com pausa/retomada/finalização, Pós-prova, adiamento de revisões, filtros e ordenações, vínculo entre cursos, cortes e grade de questões, histórico, agenda com horário, folhas de Configurações, sincronização/backup/mesclagem, fluxos curso → mapa → Reader, rota com reload e voltar, e a troca para a interface clássica e de volta.
- As suítes anteriores (`app.spec.mjs` e demais) passam a rodar na interface clássica via `storageState` em `playwright.config.mjs`. Elas continuam validando o núcleo (Reader, sincronização, backup, PWA, simulados, revisões) e garantem que o modo clássico permanece funcional. As asserções visuais da interface antiga não descrevem mais o que o usuário vê por padrão; a interface padrão é coberta pela suíte das pranchas.

## Auditoria de CSS

Medido no build V15.49.0: 54 folhas ativas, ~1,15 MB, 8 731 `!important`. As pranchas acrescentam uma única folha (46 KB) com 21 `!important`, todos na camada de integração (ocultar a marcação antiga da view e hospedar os painéis reais de Configurações). O validador passa a limitar esse número.

A consolidação das 53 folhas anteriores **não** foi feita nesta versão: elas ainda desenham o que é compartilhado (barra lateral, dock, busca, Reader, modais, painéis movidos para Configurações) e toda a interface clássica. Maiores acumuladores: `master-refinement-v15-48-1.css` (1 325), `mobile-first.css` (1 314), `content-refine-v15-25.css` (464), `home-responsive-v15-48-162.css` (437), `progress-hierarchy-v15-36-33.css` (423). Com as pranchas como padrão, as regras de Início/Cursos/Mapas/Simulados/Progresso/Agenda dessas folhas passam a valer só no modo clássico, o que permite removê-las por tela numa versão seguinte.
