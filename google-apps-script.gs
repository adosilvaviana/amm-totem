// ═══════════════════════════════════════════════════════════════
//  AMM COMPRA FÁCIL — totem de adesão
//  Webhook que grava as fichas dos 3 totens numa planilha Google.
//
//  COMO INSTALAR (5 minutos):
//   1. Crie uma planilha nova em sheets.new
//   2. Extensões → Apps Script
//   3. Apague o conteúdo e cole TODO este arquivo
//   4. Implantar → Nova implantação → tipo "App da Web"
//        Executar como:      Eu mesmo
//        Quem pode acessar:  Qualquer pessoa
//   5. Copie a URL gerada (termina em /exec)
//   6. Cole em index.html, na constante SHEETS_WEBHOOK_URL
// ═══════════════════════════════════════════════════════════════

const SHEET_NAME = 'Adesões';

const COLUNAS = [
  'ID', 'Data', 'Hora', 'Totem', 'Município', 'UF', 'Tipo de órgão',
  'Nome', 'Cargo', 'Celular', 'E-mail',
  'Plataforma hoje', 'Processos/mês', 'Interesses',
  'Agendar', 'Melhor momento',
  'Quer apresentação', 'Quer treinamento', 'Quer o termo',
  'LGPD', 'Recebido em'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);              // 3 totens podem enviar no mesmo segundo
    const d = JSON.parse(e.postData.contents);
    const sheet = abaAdesoes();

    const jaTem = acharLinha(sheet, d.id);
    const linha = montarLinha(d);

    if (jaTem > 0) {
      sheet.getRange(jaTem, 1, 1, COLUNAS.length).setValues([linha]);
    } else {
      sheet.appendRow(linha);
    }

    return json({ ok: true, id: d.id, atualizado: jaTem > 0 });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function doGet() {
  return json({ ok: true, status: 'AMM Compra Facil - webhook ativo' });
}

function montarLinha(d) {
  const tz = 'America/Sao_Paulo';
  const dt = d.timestamp ? new Date(d.timestamp) : new Date();
  const prox = String(d.proximos_passos || '');
  return [
    d.id || '',
    Utilities.formatDate(dt, tz, 'dd/MM/yyyy'),
    Utilities.formatDate(dt, tz, 'HH:mm:ss'),
    d.totem || '',
    d.municipio || '',
    d.uf || 'MG',
    d.orgao || '',
    d.nome || '',
    d.cargo || '',
    formatarTel(d.celular),
    d.email || '',
    d.plataforma_hoje || '',
    d.processos_mes || '',
    d.interesses || '',
    prox,
    d.melhor_momento || '',
    // colunas de trabalho: da pra filtrar a agenda da semana sem ler o texto
    prox.indexOf('Apresenta') >= 0  ? 'Sim' : '',
    prox.indexOf('Treinamento') >= 0 ? 'Sim' : '',
    prox.indexOf('termo') >= 0      ? 'Sim' : '',
    d.lgpd || '',
    Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm:ss')
  ];
}

// a ficha pode ser reenviada pela fila offline — atualiza em vez de duplicar
function acharLinha(sheet, id) {
  if (!id || sheet.getLastRow() < 2) return -1;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function formatarTel(v) {
  const s = String(v || '').replace(/\D/g, '');
  if (s.length === 11) return s.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (s.length === 10) return s.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return "'" + s;   // apóstrofo: impede o Sheets de comer o zero à esquerda
}

function abaAdesoes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUNAS);
    sheet.getRange(1, 1, 1, COLUNAS.length)
         .setFontWeight('bold').setBackground('#163A57').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);   // ID
    sheet.setColumnWidth(5, 180);   // Município
    sheet.setColumnWidth(8, 220);   // Nome
    sheet.setColumnWidth(11, 240);  // E-mail
    sheet.setColumnWidth(14, 300);  // Interesses
    sheet.setColumnWidth(15, 260);  // Agendar
    sheet.setColumnWidth(16, 150);  // Melhor momento
  }
  return sheet;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
                       .setMimeType(ContentService.MimeType.JSON);
}
