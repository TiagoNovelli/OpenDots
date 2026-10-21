# TODO

Ideias e melhorias planejadas para este fork do OpenDots.

## Em andamento

- [ ] **Interface em português (i18n)**: traduzir a interface e permitir escolher o idioma.
- [ ] **Presets de provedor de modelo**: Groq, OpenAI, Anthropic, OpenRouter e outros
      compatíveis com a API da OpenAI, com a correção de schema da Groq aplicada só
      onde é necessária.
- [ ] **Armazenamento próprio das conversas**: deixar de depender do CopilotKit
      Intelligence para guardar threads e mensagens.

## Próximas

- [ ] **Pet de cada Dot**: escolher o bicho (gato, cachorro, coelho, raposa…) e o nome
      de cada Dot, com animações por estado (parado, pensando, trabalhando).
- [ ] **Login multiusuário**: cada pessoa com seu login (Google/Microsoft), suas
      conversas e permissões; só administradores configuram Dots, conexões e
      ferramentas. É o que falta para o OpenDots servir a uma empresa.
- [ ] **Canais Teams, WhatsApp e Telegram**: o projeto já tem os pacotes
      `@copilotkit/channels-teams`, `channels-whatsapp` e `channels-telegram`;
      hoje só o Slack está ligado.
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

## Feito

- [x] Correção: ferramentas sem parâmetros recusadas pela Groq.
- [x] Correção: o app reconectava o runtime a cada renderização (403 repetidos).
- [x] Deploy em https://dot.brainess.com.br com Traefik e HTTPS.
- [x] Deploy automático: push no `main` → CI → deploy na VPS por chave SSH restrita.
