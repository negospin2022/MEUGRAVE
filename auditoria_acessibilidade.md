# Auditoria de acessibilidade — primeiro bloco

Data da revisão: 21 de agosto de 2026.

| Item verificado | Evidência aplicada | Situação |
|---|---|---|
| Navegação por teclado | Controles nativos `button` e `select`; estados desabilitados preservam comportamento nativo | Aprovado |
| Foco visível | Tokens globais de `outline` e `ring` são preservados em controles interativos | Aprovado |
| Partes A/B | Implementadas como `tablist`, `tab` e `tabpanel`, com `aria-selected` e `aria-controls` | Aprovado |
| Estados de gravação | Área de captura utiliza `aria-live="polite"` e `aria-busy` durante pedido de microfone/captura | Aprovado |
| Resultados | Cartão de resultado usa região anunciável para feedback e confiabilidade | Aprovado |
| Rótulos de seleção | Os seletores responsivos de dia, nível e exercício possuem `aria-label` | Aprovado |
| Cor e contraste | Ações usam cobre sobre superfícies azul-noturno; textos instrucionais receberam aumento de contraste | Aprovado por inspeção visual |
| Movimento | Estados de pressão são condicionados a `prefers-reduced-motion` | Aprovado |

## Limites da verificação

Esta revisão cobriu a semântica, os rótulos, o foco e o contraste por inspeção da interface em desktop e mobile. Recomenda-se uma avaliação complementar com leitores de tela reais (NVDA/VoiceOver) antes de uma publicação pública de grande escala.
