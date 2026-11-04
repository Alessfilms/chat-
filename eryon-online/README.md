# Eryon Online

O mapa de Eryon (o mesmo dos episódios) como um mundo aberto multiplayer:
cada seguidor entra com o seu @, anda pela vila e conversa com os outros.
Só entra quem você liberar, ou seja, quem comentou no post.

## Como funciona o acesso

### Jeito principal: o seguidor prova que é ele comentando (automático)

1. O seguidor abre o site e digita só o @ dele.
2. O site mostra uma palavra única para ele, por exemplo **ERYON 7KQ2**, com um botão para abrir o post.
3. Ele comenta essa palavra no post. Pode ser junto com outro texto, e maiúsculas ou espaços não importam.
4. Em até ~20 segundos o site encontra o comentário feito **pelo próprio @** e libera a entrada.

Ninguém consegue entrar no lugar de outra pessoa, porque só o dono da conta comenta com ela.
O site lê os comentários dos **3 posts mais recentes** da sua conta, ou só dos posts que você indicar.

#### Configurar (uma vez)

A sua conta do Instagram precisa ser **Profissional** (Criador ou Empresa): Instagram > Configurações > Tipo de conta.

1. Entre em https://developers.facebook.com, clique em **Meus apps** > **Criar app**.
2. Escolha o caso de uso **"Gerenciar mensagens e conteúdo no Instagram"** (API do Instagram com login do Instagram).
3. No painel do app: **Instagram** > **Configuração da API com login do Instagram** > **Gerar tokens de acesso** > **Adicionar conta** e entre com a sua conta.
4. Copie o token gerado. Ele precisa das permissões `instagram_business_basic` e `instagram_business_manage_comments`.
5. No Render: seu serviço > **Environment** > adicione:
   - `IG_ACCESS_TOKEN` = o token copiado
   - `IG_POST_URL` = o link do post de Eryon, por exemplo `https://www.instagram.com/p/XXXX/`. É o botão "Abrir o post" na tela de entrada.
   - (opcional) `IG_MEDIA_IDS` = IDs de posts específicos, separados por vírgula. Sem isso, o site usa os 3 posts mais recentes.
6. Salve. O Render reinicia sozinho. No painel `/admin`, a linha "Verificação pelo Instagram" deve mostrar **Ligada**.

O token vale 60 dias e o servidor renova sozinho uma vez por dia.
Se o servidor ficar parado mais de 60 dias, gere outro e troque no Render.

### Jeito reserva: código de acesso pelo painel

Enquanto o Instagram não estiver configurado, ou para liberar alguém manualmente:
abra `seu-site/admin`, cole os @ e mande o código de cada um por DM.
Na tela de entrada, a pessoa clica em **"Tenho um código de acesso"**.

**Remover** no painel bloqueia o @ nos dois jeitos.

Os 10 moradores dos episódios entram com o visual e a profissão deles:
@heitor_morrone, @lorhan_cristian, @maicon.sg2010, @pablopaesrocha, @_ray_hpl, @paocombiscoito, @altanat19, @eo_preto.031, @bio_leocordeiro e @kaguya.xs.

## Controles

- **Computador:** setas ou WASD para andar, Enter para escrever no chat.
- **Celular:** toque no lugar para onde quer andar e use a caixa de texto embaixo para falar.

## Colocar online (Render, sem precisar de servidor próprio)

1. Crie uma conta em https://render.com e conecte o seu GitHub.
2. Clique em **New +** → **Blueprint** e escolha este repositório, no branch `eryon-animation` (ou no branch para onde você levar o código).
3. O Render lê o arquivo `render.yaml`, cria o serviço `eryon-online` e gera sozinho a `ADMIN_KEY` e o `CODE_SECRET`.
4. Quando terminar, abra o serviço → **Environment** e copie o valor de `ADMIN_KEY`. Essa é a senha do painel `/admin`.
5. O endereço do site aparece no topo, algo como `https://eryon-online.onrender.com`. Coloque esse link na bio ou nos stories.

Atenção:

- **Não troque o `CODE_SECRET` depois de mandar os códigos.** Se ele mudar, todos os códigos mudam.
- **No plano gratuito do Render:**
  - o site "dorme" depois de 15 minutos sem ninguém, e a primeira pessoa espera uns 30–50 s para ele acordar;
  - as posições e as cores dos personagens podem se perder quando o servidor reinicia.
  - Os códigos e a lista de quem você liberou também ficam nesse disco, então podem sumir no reinício. Quem já recebeu código continua entrando normalmente, porque o código é calculado pelo @. Removidos voltam a entrar com o código antigo, e a lista do painel aparece vazia até eles entrarem de novo. Depois de um reinício, remova de novo quem você tinha bloqueado.
  - Para guardar tudo de forma permanente, adicione um **Disk** ao serviço, montado em `/data`, e defina a variável `DATA_DIR=/data`. Isso exige plano pago.

Outras opções que funcionam igual: Railway, Fly.io ou qualquer VPS com Node.js 18+.

## Rodar no seu computador

```bash
cd eryon-online
npm install
ADMIN_KEY=uma-senha-forte node server.js
# abra http://localhost:3000 e http://localhost:3000/admin
```

## Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `ADMIN_KEY` | Senha do painel `/admin`. Obrigatória. Sem ela o login fica desligado. |
| `CODE_SECRET` | Segredo usado para gerar os códigos. Se não existir, usa a `ADMIN_KEY`. |
| `PORT` | Porta do servidor (o Render define sozinho). |
| `IG_ACCESS_TOKEN` | Token da API do Instagram (liga a verificação pelo comentário). |
| `IG_POST_URL` | Link do post mostrado no botão "Abrir o post". |
| `IG_MEDIA_IDS` | (Opcional) IDs dos posts a verificar. Padrão: os 3 mais recentes. |
| `DATA_DIR` | Pasta onde fica o `db.json` (posições, cores, removidos). Padrão: `./data`. |

## Segurança

- **Login:** limite de tentativas por IP (12 a cada 10 minutos).
- **Chat:**
  - 120 caracteres por mensagem;
  - 1 mensagem a cada 1,2 s;
  - o texto aparece sempre como texto puro, sem HTML.
- **Movimento:** o servidor limita a velocidade de cada jogador, para ninguém se teletransportar.
- **Conexões:** uma conexão por @. Se a mesma pessoa entrar em outro aparelho, a sessão anterior cai.

## Arquivos

- `server.js`: servidor HTTP + WebSocket (login, painel, posições e chat).
- `public/index.html`, `public/game.js`: o jogo.
- `public/admin.html`: o painel do criador.
- `public/engine.js`, `public/world.json`: o mesmo motor e registro de mundo dos episódios (cópia de `eryon/`).
