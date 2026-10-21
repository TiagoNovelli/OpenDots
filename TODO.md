# TODO

Ideias e melhorias planejadas para este fork do OpenDots.

## Próximas

- [ ] **Pet de cada Dot**: escolher o bicho (gato, cachorro, coelho, raposa…) e o nome
      de cada Dot, com animações por estado (parado, pensando, trabalhando).
- [ ] **Login multiusuário**: cada pessoa com seu login (Google/Microsoft), suas
      conversas e permissões; só administradores configuram Dots, conexões e
      ferramentas. É o que falta para o OpenDots servir a uma empresa.
- [ ] **Canais Teams, WhatsApp e Telegram**: o projeto já tem os pacotes
      `@copilotkit/channels-teams`, `channels-whatsapp` e `channels-telegram`;
      hoje só o Slack está ligado.
- [ ] **Provedor reserva**: quando um provedor recusar por limite (429), tentar um
      segundo provedor configurado.
- [ ] **Modelo por Dot**: cada Dot com seu provedor e modelo.
- [ ] **Backup automático** do banco do OpenDots (Dots, páginas, chaves de push) para
      fora da VPS.
- [ ] **Notificar revisão de página pendente**: hoje só aprovações de ferramentas MCP
      avisam no celular.
- [ ] **Medir e reduzir o consumo de tokens**: quanto custa cada mensagem e quanto
      pesa cada ferramenta ligada, para decidir o que desligar por Dot.

## Ideias para depois

- [ ] **Dot de ajuda do ERP para a empresa** (provavelmente outro fork): conectado ao
      MCP `erp_ajuda`, que tem as instruções de uso do sistema, para tirar dúvidas
      dos funcionários. Depende do login multiusuário ou de um canal (Slack/Teams).
      Cuidados: só ferramentas de leitura, limites do provedor de modelo
      compartilhados por todos e privacidade das perguntas.
- [ ] **Integração com o MCP SoHome** que já existe.
- [ ] **Alternativa dentro do Odoo**: ligar o `erp_ajuda` ao `mcp_discuss_bot` para
      responder no Discuss, sem outra ferramenta nem outro login.
- [ ] **Automatic Learning**: ligar um container de aprendizado por fluxo de trabalho
      repetitivo e revisar as skills propostas.
- [ ] **Contribuir de volta para a CopilotKit**: correção de schema da Groq e correção
      dos headers que reconectavam o runtime a cada renderização.
- [ ] **Armazenamento próprio das conversas (modo sem Intelligence)**: guardar threads e
      mensagens no SQLite do próprio OpenDots, mantendo o Intelligence como opção.
      O runtime já tem o encaixe: um `AgentRunner` com endpoints locais de threads
      (o `InMemoryAgentRunner` faz isso, só que na memória). Decidimos não fazer agora
      porque, sem o Intelligence, perdem-se recursos:
  - **Automatic Learning**: o mais difícil de reconstruir com qualidade.
  - **Slack gerenciado**: daria para refazer com um app próprio no Slack.
  - **Tempo real entre abas e aparelhos**: a aba que pergunta continua recebendo
    ao vivo (SSE); faltaria um canal de eventos do servidor.
  - **Nomes automáticos das conversas**: fácil, uma chamada ao modelo.

  Faz sentido quando privacidade ou independência pesarem mais, por exemplo no fork
  da empresa.

## Feito

- [x] Correção: ferramentas sem parâmetros recusadas pela Groq.
- [x] Correção: o app reconectava o runtime a cada renderização (403 repetidos).
- [x] Deploy em https://dot.brainess.com.br com Traefik e HTTPS.
- [x] Deploy automático: push no `main` → CI → deploy na VPS por chave SSH restrita.
- [x] Presets de provedor de modelo (`MODEL_PROVIDER`): openai, groq, anthropic, gemini,
      openrouter, deepseek, mistral, xai e ollama.
- [x] Interface em português (pt-BR), com escolha de idioma nas configurações.
- [x] Medidor dos limites do provedor de modelo e mensagem amigável ao atingir o limite.
- [x] App instalável (PWA) com ícone do mascote.
- [x] Notificações no celular: tarefa agendada concluída ou com falha, e aprovação pendente.
