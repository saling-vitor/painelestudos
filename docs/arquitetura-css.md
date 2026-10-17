# Arquitetura de CSS · V15.51.0-G

O `index.html` carrega **14 folhas**, nesta ordem (a ordem É a cascata — não reordenar):

| # | Arquivo | Responsabilidade |
|---|---|---|
| 1 | `design-system/nanquim-tokens.css` | Tokens Nanquim/Grafite/Papel/Latão e famílias de fonte |
| 2 | `design-system/nanquim-typography.css` | `@font-face` locais e escala de 14 tokens `--fs-*` |
| 3 | `app.css` | Base da aplicação: shell, componentes, leitor, modais |
| 4 | `study-dashboard.css` | Painel de estudo, sessão, agenda rápida |
| 5 | `study-planner.css` | Planejador, matriz, caderno de erros |
| 6 | `mobile-first.css` | Layout de celular (`html.is-phone-layout`) |
| 7 | `camada-1-refinos-telas.css` | 10 folhas antigas de refino de telas (cores, cursos, início, sistema, conteúdo, mapas, iPad, biblioteca, chrome) |
| 8 | `camada-2-responsivo-dispositivos.css` | 19 folhas V15.36 de ajuste por dispositivo (Desktop/iPad/celular) |
| 9 | `camada-3-automacao-configuracoes.css` | Automação de estudo, central de configurações, curso no iPad |
| 10 | `camada-4-vidro-ambiente.css` | Vidro (shell/superfícies), ambiente topográfico, design system V15.42, paridade V211, vidro dinâmico |
| 11 | `camada-5-acabamento-final.css` | Refino mestre, navegação em vidro, ícones Lucide PNG, estados vazios, Início responsivo, Grafite fumê |
| 12 | `design-system/nanquim-materials.css` | Materiais (vidro só no que flutua) |
| 13 | `design-system/nanquim-application.css` | Aplicação da paleta e tokens efetivos sobre o legado |
| 14 | `design-system/prancha.css` | Interface em pranchas (padrão) e camada de integração |

`design-system/nanquim-study-v211.css` não é carregado pelo app: é a fonte canônica do tema embutido nos mapas V211 (o validador confere que cada mapa contém o texto exato).

## Camadas consolidadas

As camadas 1–5 juntam, **na mesma ordem**, as 45 folhas de remendo que antes eram carregadas separadamente. Cada trecho começa com um marcador

```
/* ════ @origem assets/css/<arquivo-antigo>.css ════ */
```

e `scripts/css-layers.json` liga cada folha antiga à sua camada. O validador (`readCss`) usa esse mapa para continuar aplicando as travas históricas sobre o trecho certo.

## Regras para mexer no CSS

1. **Corrija na origem.** Se um valor precisa mudar, edite a regra que o define (procure o seletor e veja qual vence). Não acrescente uma folha nova nem um bloco "vNN" no fim do `index.html` para sobrepor — foi esse hábito que gerou 8 768 `!important`.
2. **Interface em pranchas** → `design-system/prancha.css`. **Tokens/paleta** → `nanquim-tokens.css` / `nanquim-application.css`. **Interface clássica** → a camada onde a regra já está.
3. Depois de editar, rode `npm run audit:css`. Ele lista declarações que nunca podem vencer (sobrescritas por uma regra posterior com o mesmo seletor, mesmo contexto ou contexto mais amplo e importância igual ou maior). `npm run audit:css -- --apply` remove essas declarações; `SHORTHAND=1` inclui a dominância por shorthand (ex.: `padding` depois de `padding-top`).
4. `node scripts/validate-release.mjs` mantém o orçamento único de `!important` (≤ 7 570). Um novo `!important` exige remover outro.
5. A paridade visual é verificada pela suíte `tests/e2e/auditoria-plataformas.spec.mjs` (projeto `auditoria-plataformas`). Com `AUDIT_OUT=<pasta>` ela grava screenshots e o hash do estilo computado de cada elemento, em 5 viewports e nos dois modos — compare duas execuções para provar que uma limpeza não mudou nada.

## Por que não foi reorganizado "por componente"

Mover uma regra de lugar muda a cascata sempre que outra regra com a mesma especificidade disputa a mesma propriedade. Sem prova regra a regra, reordenar por componente arriscaria quebrar o visual aprovado nas três plataformas. A consolidação preservou a ordem; a remoção de código morto foi feita só onde a dominância é demonstrável. A próxima etapa natural é, tela por tela, mover para `prancha.css` o que só a interface em pranchas usa e apagar da camada antiga o que só a clássica usava — quando a clássica deixar de ser oferecida.
