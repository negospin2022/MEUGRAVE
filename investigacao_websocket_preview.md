# Investigação do aviso WebSocket na pré-visualização

## Ocorrência observada

A captura apresentada pelo usuário mostra a mensagem do Vite `failed to connect to websocket`, tentando alcançar o endereço temporário de pré-visualização. Esse canal é usado pelo ambiente de desenvolvimento para atualizações rápidas de código, não pela execução normal do aplicativo publicado.

## Verificação realizada

A versão publicada em `https://meugrave-fre8cr4z.manus.space` foi aberta diretamente. A página carregou a interface de treino completa, incluindo a escolha de blocos, os controles de áudio e a rotina inicial, sem mostrar o aviso. A inspeção do console do navegador publicado não retornou erros. Os registros de produção contêm apenas a inicialização do OAuth e do servidor, sem falhas de aplicação.

## Conclusão

> O aviso está restrito à pré-visualização baseada no servidor de desenvolvimento. Ele não indica uma falha do aplicativo publicado e não requer alteração no código de produção.

Para testar o aplicativo, deve-se usar o domínio publicado. A pré-visualização continua útil para acompanhar mudanças durante a edição, mas pode eventualmente exibir aviso de WebSocket quando sua conexão temporária de desenvolvimento for interrompida.
