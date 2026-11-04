# Eryon Online

O mapa de Eryon (o mesmo dos episódios) como um mundo aberto multiplayer:
cada seguidor entra com o seu @, anda pela vila e conversa com os outros.
Só entra quem você liberar, ou seja, quem comentou no post.

## Como funciona o acesso

1. Você abre `seu-site/admin` e entra com a sua chave de admin.
2. Cola a lista de @ de quem comentou e clica em **Liberar acesso**.
3. O painel mostra um código de 6 letras para cada @ e um botão **Copiar mensagem**, com o texto pronto para mandar por DM.
4. O seguidor abre o site, digita o @ dele e o código, escolhe as cores do personagem e entra.

Os códigos são calculados a partir do @ e de um segredo do servidor (`CODE_SECRET`).
Por isso continuam valendo mesmo se o servidor reiniciar e apagar os arquivos.
Para cortar o acesso de alguém, clique em **Remover** no painel.
Para trocar o código de alguém, clique em **Novo código**.

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
