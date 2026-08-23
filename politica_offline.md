# Política de uso offline — MEU GRAVE

No **modo offline**, a interface mostra exclusivamente o **resultado atual** da parte em execução. O aplicativo não apresenta comparação histórica, gráficos de sessões anteriores nem os três resultados anteriores enquanto não houver perfil online e sincronização concluída.

Há uma exceção técnica necessária: se o usuário concluir uma gravação sem conexão e depois trocar de exercício, o aplicativo preserva localmente apenas os metadados e o áudio daquela sessão **pendente de sincronização**. Essa retenção não é exibida como histórico e existe somente para evitar perda de dados quando a internet voltar. Após confirmação online, o áudio é removido do armazenamento local e os resultados antigos confirmados deixam de ser persistidos localmente.

| Estado | Resultado visível | Áudio local | Finalidade |
|---|---|---|---|
| Offline, sessão atual | Sim | Sim | Exibir a análise atual e permitir nova gravação |
| Offline, sessão pendente antiga | Não | Sim | Garantir sincronização posterior sem perda |
| Online, confirmado | Pelo histórico online | Não | O servidor passa a ser a fonte do histórico |

