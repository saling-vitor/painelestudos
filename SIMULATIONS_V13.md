# Simulados · V13.0

O módulo **Simulados** é uma entidade independente de mapas. O catálogo bundled fica em `data/simulados.json`; HTMLs importados ficam no bucket privado já existente `study-maps`, sob `{user_id}/simulations/{course_id}/{code}.html`.

## Metadados recomendados para novas templates

- `study-content-type=simulation`
- `simulation-title`
- `simulation-code`
- `simulation-version`
- `simulation-board`
- `simulation-question-count`
- `simulation-duration-minutes`
- `simulation-storage-id`

A V13.0 não reescreve HTMLs antigos e não executa scripts durante a leitura de metadados.

## Ponte futura de resultados · V13.1+

A V13.0 apenas documenta este contrato e não depende dele:

```js
window.parent.postMessage({
  type: 'MEUS_MAPAS_SIM_RESULT',
  payload: {
    simulationId: '...',
    score: 0,
    correct: 0,
    wrong: 0,
    blank: 0,
    durationSeconds: 0
  }
}, '*');
```

Resultados, tentativas, gráficos e banco de questões permanecem fora do escopo da V13.0.
