<div align="center">

# OpenDots

### Assistentes de IA sempre ligados, com conversa, chamadas de voz e um computador próprio.

**Fork brasileiro do [CopilotKit/OpenDots](https://github.com/CopilotKit/OpenDots): interface em português, vários provedores de modelo, app instalável no celular e notificações.**

[English](README.md) · [Começar](#começar) · [Notificações no celular](#notificações-no-celular) · [Publicar numa VPS](#publicar-numa-vps) · [Planos](TODO.md)

[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](./LICENSE)
![Alpha](https://img.shields.io/badge/status-alpha-orange.svg)

</div>

---

## O que é

O OpenDots é um modelo open source para montar o seu próprio "dots": assistentes de IA (os **Dots**) que guardam conversas, trabalham em segundo plano, usam ferramentas e pedem a sua aprovação antes de agir. Você roda na sua máquina ou no seu servidor e muda o que quiser.

É um **modelo para clonar e adaptar**, não um serviço pronto, e ainda está em **alpha**: espere arestas.

### O que este fork acrescenta

| Recurso                     | O que faz                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Interface em português**  | Toda a interface em pt-BR. O idioma segue o navegador e pode ser trocado em **Configurações → Idioma**.                               |
| **Presets de provedor**     | `MODEL_PROVIDER=groq` (ou `openai`, `anthropic`, `gemini`, `openrouter`, `deepseek`, `mistral`, `xai`, `ollama`) com uma variável só. |
| **Medidor de limite**       | Mostra quanto ainda resta de requisições e tokens no provedor e avisa, em português, quando o limite estoura.                         |
| **App instalável (PWA)**    | Adicione à tela inicial do celular e use como app, com o ícone do mascote.                                                            |
| **Notificações no celular** | Avisa quando uma tarefa agendada termina ou falha e quando um Dot precisa da sua aprovação.                                           |
| **Correções**               | Compatibilidade com a Groq (ferramentas sem parâmetros) e o fim de uma reconexão a cada renderização que gerava erros 403 repetidos.  |

### O que já vinha do original

- **Espaços e páginas:** biblioteca de documentos com editor visual, subpáginas e salvamento automático.
- **Dots especialistas:** cada um com nome, instruções, permissões e ferramentas próprias.
- **Conexões MCP:** dê ao Dot ferramentas de qualquer servidor MCP. As que só leem rodam sozinhas, e as demais pedem **Aprovar e executar** no chat.
- **Revisão antes de salvar:** o Dot mostra o rascunho e só salva com a sua aprovação.
- **Tarefas agendadas:** rodam no servidor, na mesma conversa, mesmo com o navegador fechado.
- **Computador do Dot (opcional):** navegador, arquivos e terminal isolados por Dot, via [OpenBot](https://github.com/CopilotKit/OpenBot).
- **Chamadas de voz, Slack, apps conectados (Composio) e Aprendizado automático.**

## Começar

Você precisa de **Node.js 24** e **npm**.

```sh
git clone https://github.com/TiagoNovelli/OpenDots.git
cd OpenDots
npm ci
cp .env.example .env
```

### 1. Onde ficam as conversas

O OpenDots guarda as conversas no **CopilotKit Intelligence**. O plano grátis basta para uso pessoal. Entre com a sua conta e escolha (ou crie) um projeto na pasta `OpenDots`:

```sh
npx copilotkit@latest login
npx copilotkit@latest project select
```

O segundo comando grava a chave `CPK_INTELLIGENCE_API_KEY` no `.env`. Não rode `copilotkit onboard` nesta pasta: ele adiciona uma segunda integração genérica.

### 2. Qual modelo usar

Escolha um provedor no `.env`. Exemplo com a Groq, que tem plano grátis:

```sh
MODEL_PROVIDER=groq
GROQ_API_KEY=gsk_...
# MODEL_NAME é opcional: a Groq já vem com openai/gpt-oss-120b
```

Outros presets e o que cada um precisa estão em [docs/SETUP.md](docs/SETUP.md#model-providers). Quem já usava `OPENAI_API_KEY`, `OPENAI_BASE_URL` e `OPENAI_MODEL` não precisa mudar nada.

> **Sobre o limite grátis da Groq:** cerca de 8 mil tokens por minuto. Uma mensagem simples gasta perto de 1.700 tokens, porque as instruções e as ferramentas vão junto. Dá para testar e conversar, mas tarefas com pesquisa e ferramentas esbarram no limite. Para uso diário, considere um plano pago por uso. O medidor em **Configurações** mostra quanto resta.

### 3. Rodar

```sh
npm run dev
```

Abra **http://127.0.0.1:5173**. Você já pode criar Espaços, escrever páginas e configurar Dots antes de conectar os serviços.

## Instalar no celular

O OpenDots funciona como app (PWA). Ele precisa estar publicado com **HTTPS** (veja [Publicar numa VPS](#publicar-numa-vps)).

- **Android (Chrome):** abra o site, toque no menu **⋮** e escolha **Instalar app** ou **Adicionar à tela inicial**.
- **iPhone (Safari):** abra o site, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**. A partir daí, **abra sempre pelo ícone**.

Por segurança, a senha de acesso fica guardada só enquanto o app está aberto. Ao reabrir, ele pede de novo.

## Notificações no celular

O OpenDots avisa no celular quando:

- uma **tarefa agendada termina** ou **precisa de atenção** (falhou);
- um **Dot precisa da sua aprovação** para usar uma ferramenta de um servidor MCP.

O texto chega no idioma que o aparelho usava quando você ativou.

### Como ativar

1. **Instale o app** (seção acima). No iPhone isso é obrigatório: notificações só funcionam no app aberto pelo ícone da Tela de Início, com iOS 16.4 ou mais novo.
2. Abra o OpenDots e vá em **Configurações → Notificações no celular**.
3. Toque em **Ativar notificações** e aceite a permissão do sistema.
4. Toque em **Enviar teste**. Em alguns segundos chega _"Notificações ativadas"_.

Faça isso em **cada aparelho** que deve receber avisos. Para parar, use **Desativar** no mesmo lugar.

### Se não chegar

| Situação                                                    | O que fazer                                                                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Aparece _"Este navegador não recebe notificações"_          | No iPhone, instale na Tela de Início e abra pelo ícone. Em outros casos, use um navegador atual (Chrome, Edge, Firefox, Safari). |
| Aparece _"As notificações estão bloqueadas para este site"_ | Libere as notificações do site nas configurações do navegador ou do celular e recarregue.                                        |
| O teste não chega                                           | Verifique se o modo "Não perturbe" ou a economia de bateria estão bloqueando o app. Desative e ative de novo.                    |
| Rodando sem HTTPS                                           | Notificações só funcionam em HTTPS (ou em `localhost`, no computador).                                                           |

### Para quem administra o servidor

- O servidor cria as **chaves de push (VAPID)** sozinho, na primeira vez que sobe, e as guarda no banco (`DATABASE_PATH`). Faça backup desse arquivo: chaves novas invalidam os aparelhos já inscritos.
- `PUSH_SUBJECT` é o contato enviado aos serviços de push. Por padrão, usa o primeiro endereço `https` de `APP_ORIGIN`. A Apple recusa endereços de exemplo, então use o endereço real do seu site.

## Publicar numa VPS

O projeto já traz `Dockerfile` e `compose.yml`. Fora do `localhost`, o OpenDots **exige** uma senha de acesso (`OWNER_TOKEN`, com pelo menos 24 caracteres).

1. No servidor, clone o projeto e crie o `.env` com as chaves do Intelligence e do modelo, mais:

   ```sh
   OWNER_TOKEN=uma-senha-longa-e-aleatória   # ex.: openssl rand -base64 30
   APP_ORIGIN=https://dots.seu-dominio.com.br
   ```

2. Suba o container:

   ```sh
   docker compose up -d --build app
   ```

   O app fica em `127.0.0.1:4310`. Coloque um proxy com HTTPS na frente (Traefik, Caddy, Nginx). Com **Traefik**, um `compose.override.yml` ao lado do `compose.yml` basta:

   ```yaml
   services:
     app:
       networks: [traefik]
       labels:
         - traefik.enable=true
         - traefik.http.routers.opendots.rule=Host(`dots.seu-dominio.com.br`)
         - traefik.http.routers.opendots.entrypoints=websecure
         - traefik.http.routers.opendots.tls.certresolver=letsencrypt
         - traefik.http.services.opendots.loadbalancer.server.port=4310
   networks:
     traefik:
       external: true
   ```

   Ajuste o nome da rede, do entrypoint e do certresolver ao seu Traefik.

3. Para ver a senha depois: `grep ^OWNER_TOKEN= .env` no servidor.

### Deploy automático

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publica o `main` na VPS depois que o CI passa. Ele usa uma chave SSH **só para deploy**, presa no servidor a um único script (`command=` no `authorized_keys`), de modo que ela não abre terminal nem roda outros comandos. Pull requests nunca fazem deploy.

Para usar no seu fork:

1. Copie [`deployment/vps/opendots-deploy.sh`](deployment/vps/opendots-deploy.sh) para `/usr/local/bin/opendots-deploy` no servidor (ajuste o caminho `/opt/opendots` se o projeto estiver em outro lugar). Ele fica fora da pasta do projeto para que nenhum commit consiga mudar o que a chave executa.
2. Gere uma chave só para o deploy (`ssh-keygen -t ed25519 -f opendots_deploy`) e adicione a pública ao `authorized_keys` do servidor assim:
   ```
   restrict,command="/usr/local/bin/opendots-deploy" ssh-ed25519 AAAA... github-deploy
   ```
3. No workflow, troque o IP e a chave pública do servidor (`HOST_KEY`, que você obtém com `ssh-keyscan -t ed25519 SEU_IP`).
4. Cadastre a chave **privada** como _secret_ `OPENDOTS_DEPLOY_KEY` em **Settings → Secrets and variables → Actions** do GitHub.

## Dados e privacidade

- **Conversas** ficam no CopilotKit Intelligence (na nuvem da CopilotKit, no plano hospedado).
- **O provedor do modelo** recebe o contexto da conversa, incluindo páginas autorizadas e resultados de ferramentas.
- **Páginas, Dots e configurações** ficam no SQLite local (`DATABASE_PATH`).
- **Telemetria:** o SDK da CopilotKit envia metadados de uso por padrão. Para desligar, use `COPILOTKIT_TELEMETRY_DISABLED=true` ou `DO_NOT_TRACK=1`.
- **Pesquisa na web** usa o Parallel por padrão. Para desligar, use `WEB_SEARCH_PROVIDER=disabled`.

Detalhes em [README.md](README.md#data-and-privacy) e [docs/TELEMETRY.md](docs/TELEMETRY.md).

## Limitações

- **Um dono só:** não há login de várias pessoas. Quem tem a senha é o dono.
- **Alpha:** recursos e configurações ainda mudam.
- **Sem o Intelligence não há conversas.** Um modo com armazenamento próprio está em estudo no [TODO.md](TODO.md).

## Documentação

| Assunto                           | Onde                                       |
| --------------------------------- | ------------------------------------------ |
| Configuração completa (em inglês) | [docs/SETUP.md](docs/SETUP.md)             |
| Conexões MCP                      | [docs/CONNECTIONS.md](docs/CONNECTIONS.md) |
| Computador dos Dots               | [docs/COMPUTERS.md](docs/COMPUTERS.md)     |
| Próximas melhorias deste fork     | [TODO.md](TODO.md)                         |
| Como contribuir                   | [CONTRIBUTING.md](CONTRIBUTING.md)         |

## Créditos e licença

Baseado no [OpenDots da CopilotKit](https://github.com/CopilotKit/OpenDots), com [CopilotKit](https://github.com/CopilotKit/CopilotKit) e [AG-UI](https://docs.ag-ui.com/introduction). Licença [MIT](LICENSE), mantida do projeto original.
