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

### Painel

5 toques no logo + PIN `2026`. Mostra captadas / enviadas / na fila, exporta CSV (`;` e
BOM, abre no Excel em português sem embaralhar acento) e copia tudo para a área de
transferência.

---

## O fecho é o agendamento

Decisão do Ado em 19/10/2026: o passo 3 não termina pedindo um documento, termina
**marcando uma conversa**. `Vamos agendar?` e `Quando é melhor falar com você?` são
**obrigatórios**, e a confirmação devolve o combinado por extenso
(`textoConfirmacao()`): quando, por qual canal e para quê.

Na planilha isso vira as colunas de trabalho **Quer apresentação / Quer treinamento /
Quer o termo** e **Melhor momento** — dá para filtrar a agenda da semana sem ler texto.

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

- [ ] Criar a planilha e colar a URL em `SHEETS_WEBHOOK_URL` — **bloqueador**
- [ ] Publicar no GitHub Pages (repo `amm-totem`) — **bloqueador**
- [ ] Testar nos 3 totens reais: touch, teclado na tela, brilho, tela cheia
- [ ] Confirmar que o wi-fi do evento não bloqueia `script.google.com`
- [ ] Apagar as linhas de teste da planilha antes de abrir ao público
