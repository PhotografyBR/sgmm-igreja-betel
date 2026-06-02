/**
 * Serviço de envio de mensagens WhatsApp via Z-API
 *
 * Variáveis de ambiente necessárias:
 *   ZAPI_INSTANCE_ID  — ID da instância Z-API
 *   ZAPI_TOKEN        — Token da instância Z-API
 *   ZAPI_CLIENT_TOKEN — Client Token (Security Token) do painel Z-API (opcional mas recomendado)
 */

const ZAPI_BASE = 'https://api.z-api.io/instances';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.ZAPI_CLIENT_TOKEN) {
    headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN;
  }
  return headers;
}

/**
 * Formata o número para o padrão internacional sem símbolos
 * Ex: "19996948474" → "5519996948474"
 */
function formatPhone(phone) {
  let num = phone.replace(/\D/g, '');
  if (!num.startsWith('55')) num = '55' + num;
  return num;
}

/**
 * Envia uma mensagem de texto simples via Z-API
 */
async function sendMessage(phone, message) {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token) {
    console.warn('[WhatsApp] ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados. Mensagem não enviada.');
    return false;
  }

  const formattedPhone = formatPhone(phone);
  const url = `${ZAPI_BASE}/${instanceId}/token/${token}/send-text`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        phone: formattedPhone,
        message
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[WhatsApp] Mensagem enviada para ${formattedPhone}`);
      return true;
    } else {
      console.error(`[WhatsApp] Erro ao enviar para ${formattedPhone}:`, JSON.stringify(data));
      return false;
    }
  } catch (err) {
    console.error('[WhatsApp] Falha na requisição Z-API:', err.message);
    return false;
  }
}

/**
 * Notifica um voluntário que foi escalado
 */
async function notificarEscalado({ nome, phone, titulo, data, hora, funcao, urlSistema, confirmToken }) {
  if (!phone) return false;

  const dataFormatada = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  const horaTexto = hora ? ` às ${hora}` : '';
  const funcaoTexto = funcao ? `\n📌 *Função:* ${funcao}` : '';

  // Link direto de confirmação (sem precisar de login)
  const baseUrl = urlSistema || 'https://sgmm-igreja-betel-production.up.railway.app';
  const linkConfirmacao = confirmToken
    ? `\n\n👇 *Confirme sua presença pelo link abaixo:*\n${baseUrl}/api/schedules/confirmar/${confirmToken}`
    : `\n\n🔗 Acesse o sistema: ${baseUrl}`;

  const mensagem =
    `Olá, *${nome}*! 👋\n\n` +
    `Você foi escalado(a) para:\n\n` +
    `📅 *${titulo}*\n` +
    `🗓 ${dataFormatada}${horaTexto}` +
    funcaoTexto +
    linkConfirmacao +
    `\n\nQualquer dúvida, fale com o líder. Deus abençoe! 🙏`;

  return sendMessage(phone, mensagem);
}

/**
 * Notifica o líder quando um voluntário confirma ou recusa presença
 */
async function notificarLider({ phoneL, nomeVoluntario, tituloEscala, status }) {
  if (!phoneL) return false;

  const emoji = status === 'confirmed' ? '✅' : '❌';
  const acao = status === 'confirmed' ? 'confirmou' : 'recusou';

  const mensagem =
    `${em