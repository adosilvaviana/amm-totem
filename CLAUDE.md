# CLAUDE.md — AMM Compra Fácil · totem de adesão

> Leia este arquivo inteiro antes de mexer em qualquer coisa.

---

## O que é

Totem de captação de adesões ao **AMM Compra Fácil** (plataforma de compras da Associação
Mineira de Municípios). **Evento de 20/10/2026**, 3 totens no stand.
Público: prefeitos, secretários, pregoeiros e setor de compras de municípios de MG.
Destinatários dos leads: **Rodrigo e Nathiely**, da AMM.

Herdou os campos e os textos de um pacote anterior (`TOTEM.zip`, 3 pastas com `.bat` de
quiosque e envio para um "PC coletor" na rede local). **O conteúdo foi mantido; a entrega
mudou:** um único deploy no GitHub Pages, três URLs, e os leads vão direto para uma
planilha Google.

---

## Totem (especificação)

| Item | Valor |
|---|---|
| Tela | 50", **horizontal (landscape)**, 1920×1080 |
| Abertura | navegador comum (Chrome/Edge), **não** quiosque por `.bat` |
| Tela cheia | botão no cabeçalho — foi pedido explicitamente |

**É horizontal.** O pacote antigo recomendava retrato; o Ado confirmou landscape em
19/10/2026. O layout do passo é de **duas colunas** por causa disso — em retrato o
`@media (orientation:portrait)` cai para uma coluna só.

---

## Rodar e publicar

```bash
python3 -m http.server 8767      # → http://localhost:8767/?totem=1
```

Publicar:

```bash
git add -A && git commit -m "descrição" && git push origin main
```

GitHub Pages publica em ~1 min. **Depois do push, `Ctrl+Shift+R` no totem** — o Pages
serve com cache; sem recarga forçada o totem pode rodar a versão antiga por minutos.

---

## Arquitetura

Arquivo único, zero dependências, zero build: `index.html` + `logo-amm.png`.

- **Um deploy, três totens:** `?totem=1|2|3` vira `NOME_TOTEM` ("Totem 1"). Sem o
  parâmetro vira **"Totem ?"** — de propósito: aparece no cabeçalho e na planilha, então
  um totem mal configurado se denuncia em vez de se misturar aos outros.
- **Navegação:** `paint()` troca a `.pane` visível. Sem router, sem hash.
- **Toques:** listener por elemento (chips, botões). Nunca `onclick` inline.
- **Persistência:** `localStorage` (`ammcf_leads_v2`), com `enviado: "sim"|"nao"`.
- **XSS:** o autocomplete monta HTML (para o `<mark>`), e **só ele** — passa por `esc()`.
- **Não existe `<form>` no documento.** É de propósito: sem submit de formulário o Chrome
  nunca salva nem oferece os dados de um visitante para o próximo.

### Teclado na tela (20/10/2026)

**O Chrome no Windows dos totens não abria o teclado virtual do sistema** ao tocar nos
campos. Depende de configuração do Windows e de a tela se apresentar como touch e não
como mouse, então o totem traz o **próprio teclado** (`#kb`, funções `kb*`).

- Todo campo digitável tem `data-kb` (`texto` / `email` / `numero`), `data-kbl` (rótulo
  da faixa) e **`inputmode="none"`**: se o teclado do Windows passar a funcionar, ele não
  aparece por cima do nosso. Teclado físico continua funcionando.
- Digita sempre **no fim** do campo e dispara `input`: máscara do telefone e autocomplete
  do município funcionam como digitação normal. Campo novo precisa só dos atributos.
- A faixa no topo do teclado mostra o que está sendo digitado (PIN aparece como `•`).
- Maiúscula automática no começo de cada palavra (nome, município); o ⇧ **inverte**, para
  dar "da", "de". E-mail sempre minúsculo, com atalhos `.com`, `.gov.br`, `.mg.gov.br`.
- Com o teclado aberto o passo rola (`body.kb-open`) e o campo sobe para cima dele.
- `preventDefault` no `pointerdown`/`mousedown` do teclado mantém o foco no campo — e por
  isso engole o `mousedown` do timer de inatividade: `kbTecla` chama `resetIdle()` à mão.
- Campo focado por código (`.focus()`) precisa de `kbAbrir()` junto: o evento `focus` nem
  sempre chega quando a janela não está em primeiro plano.

### Fim do cadastro

A confirmação **não mostra o telefone** da pessoa (pedido de 20/10/2026: a tela fica à
vista do próximo da fila). "Novo cadastro" e a contagem de 12 s voltam para a **abertura
azul**, não para o passo 1.

### Dimensionamento em `vh`, não em `px`

Tudo — fonte, padding, altura de botão — está em `vh`. O motivo é o **zoom do Windows**:
com escala em 150% a viewport encolhe, e um layout em `px` estoura ou abre minúsculo no
meio da tela de 50". Em `vh` o layout acompanha. Se for mexer no CSS, **mantenha `vh`**.

### A armadilha de especificidade do LGPD

O consentimento é `label.consent`, **não** `.consent`. A regra `.f>label` (0,1,1) tem
especificidade maior que `.consent` (0,1,0) e vencia o `display:flex` — o quadradinho do
checkbox esticava para a largura toda e virava uma barra azul. Escrito como
`label.consent` empata em especificidade e vence por vir depois. **Não troque de volta.**

---

## Leads

Gravados em `localStorage` **e** enviados para uma planilha Google.

### Fila offline

Toda ficha é gravada no aparelho **antes** de qualquer tentativa de envio. `sincronizar()`
percorre as pendentes e **grava o estado a cada ficha** — queda de rede no meio não faz o
que já subiu subir de novo. Reenvio a cada 20 s e no evento `online`.

Reenviar a mesma ficha é inofensivo: o Apps Script procura o `id` antes de inserir e
**atualiza a linha em vez de duplicar** (`acharLinha`).

### Planilha

Webhook Apps Script em `SHEETS_WEBHOOK_URL`, no topo do `<script>`. Fonte em
`google-apps-script.gs`, com o passo a passo de implantação no cabeçalho.

Se a constante ficar vazia, nada é enviado: tudo fica local e o indicador mostra
**● local**. O totem funciona igual — o CSV do painel é a saída.

**Testar o webhook pelo terminal:** `curl -L` não serve — o Apps Script responde 302 e o
curl perde o POST no redirecionamento, devolvendo "página não encontrada" mesmo com tudo
certo. Siga o redirect à mão:

```bash
U='...exec'
L=$(curl -s -o /dev/null -w "%{redirect_url}" -X POST "$U" \
     -H 'Content-Type: text/plain;charset=utf-8' -d '{"id":"T1","nome":"Teste"}')
curl -s "$L"     # → {"ok":true,"id":"T1","atualizado":false}
```

**CORS:** o POST vai com `Content-Type: text/plain`, que é "simple request" e não dispara
preflight — o Apps Script não responde preflight. Não troque para `application/json`.

### Atalho de teste (preencher sem digitar)

**2 toques rápidos no logo do cabeçalho** preenchem os 3 passos com dados fictícios
(`preencherTeste()`): município sorteado, Prefeitura, nome `TESTE <nome>`, cargo, celular
`(31) 99999-xxxx`, `testexxxx@exemplo.com`, formato e quando sorteados, LGPD marcado.
O caminho fica **Continuar, Continuar, Enviar**. Mesma ideia do atalho do FENICS.

O atalho espera 700 ms sem toque para decidir, então os 5 toques do painel não
disparam o preenchimento no caminho. Um toque só não faz nada.

**A ficha de teste vai para a planilha de verdade.** Todo nome começa com `TESTE ` e todo
e-mail com `teste`: filtrar e apagar essas linhas antes de entregar para a AMM.

### Painel

5 toques no logo + PIN `2026`. **"Apagar tudo deste totem" pede o PIN de novo**, digitado numa caixa
dentro do painel, que avisa quantas fichas ainda não subiram. Antes eram dois `confirm()`
do navegador, e num totem de toque dois toques no mesmo lugar passavam pelos dois. Não
voltar para `confirm()`. Mostra captadas / enviadas / na fila, exporta CSV (`;` e
BOM, abre no Excel em português sem embaralhar acento) e copia tudo para a área de
transferência.

---

## O fecho é o agendamento

Decisão do Ado em 19/10/2026: o passo 3 não termina pedindo um documento, termina
**marcando uma conversa**. `Como você prefere conhecer a plataforma?` e `Quando é melhor
falar com você?` são **obrigatórios** e de escolha única, e a confirmação devolve o
combinado por extenso (`textoConfirmacao()`): quando, por qual canal e para quê.

**Não pedir termo nem treinamento no totem** (Ado, 20/10/2026): quem passa no stand
ainda não conhece a plataforma. As opções antigas ("Treinamento da equipe", "Receber o
termo de adesão") viraram o formato de conhecer: Apresentação online / Ligação rápida /
Material pelo WhatsApp. O "quando" é Esta semana / Semana que vem / Mês que vem /
Qualquer momento.

**O passo 3 só tem o agendamento** (pedido da AMM em 19/10/2026, aplicado em 20/10): saíram
"usa plataforma de licitação?" (a AMM já sabe quem usa o AMM-Licita), "quantos processos
por mês" e "o que mais interessa" — prefeito não sabe responder isso. As colunas
`plataforma_hoje`, `processos_mes` e `interesses` continuam na planilha e no CSV, vazias
nas fichas novas, para as linhas antigas não desalinharem. Não precisa reimplantar o
Apps Script por causa disso: ele grava `''` no que não vier.

Na planilha o formato escolhido cai em `proximos_passos`. As colunas derivadas **Quer
apresentação / Quer treinamento / Quer o termo** são do formato antigo: só "Quer
apresentação" ainda acende (quando a escolha é "Apresentação online"). Filtrar pela
coluna `proximos_passos` e por **Melhor momento** dá a agenda da semana sem ler texto.

**Na planilha (20/10/2026):** a coluna O foi renomeada de "Agendar" para **"Como quer
conhecer"**, e L, M, N (Plataforma hoje, Processos/mês, Interesses) e R, S (Quer
treinamento, Quer o termo) foram **ocultadas, não apagadas**. Ocultar foi escolha de
propósito no dia do evento: o Apps Script grava por posição (21 colunas), então apagar
coluna exige mudar `COLUNAS`/`montarLinha` e reimplantar no mesmo minuto, senão a ficha
que chegar no intervalo cai deslocada. O `.gs` do repositório já usa o nome novo da O,
mas o publicado não precisa ser reimplantado por isso: ele só escreve o cabeçalho numa
aba vazia.

---

## O que NÃO fazer

- Não dividir em vários arquivos nem adicionar framework: tem que abrir rápido e simples.
- Não usar `px` para tamanho de texto, campo ou botão — ver o item do zoom do Windows.
- Não trocar `label.consent` por `.consent`.
- Não mandar o POST como `application/json` (preflight).
- Não tirar o `?totem=` nem fazer o código adivinhar o número do totem.
- Não criar `<form>` em volta dos campos (autofill do Chrome entre visitantes).

---

## Pendências

- [x] Publicado no GitHub Pages — `https://adosilvaviana.github.io/amm-totem/?totem=1|2|3`
- [x] Planilha ligada e testada de ponta a ponta em 19/10/2026 — ficha pelo endereço
      do Totem 1 chegou na aba `Adesões` com as 21 colunas certas, e o reenvio do mesmo
      `id` devolveu `atualizado:true` (atualiza a linha, não duplica)
- [ ] **Apagar as linhas de teste** da planilha (`DIAG-001`, nomes `TESTE ` e o "Ado teste" de 20/10)
- [ ] Testar nos 3 totens reais: touch, teclado na tela, brilho, tela cheia
- [ ] Confirmar que o wi-fi do evento não bloqueia `script.google.com`

### Planilha

**Leads AMM Compra Fácil — Totens**, na conta `moboxoficial@gmail.com`:
`https://docs.google.com/spreadsheets/d/10M96ZpjCDG_z5s8cfTJJlDW8gpdF1DNyhWaSICzZMW4/edit`

**Extensões → Apps Script abre na conta PADRÃO do navegador**, não na dona do arquivo.
Com mais de uma conta logada ele procura a planilha na conta errada e devolve
"Não foi possível abrir o arquivo" / "Página não encontrada" — não é a planilha que
está quebrada. Abrir numa janela anônima logada só na conta dona resolve. Mordeu em
19/10/2026, no Comet.
