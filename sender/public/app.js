/**
 * Controla la experiencia visual tipo mensajería.
 * La interfaz muestra una conversación simple y mueve los datos técnicos a paneles inferiores.
 */

const connectionStatus = document.querySelector("#connection-status");
const infoButton = document.querySelector("#info-button");
const prepareButton = document.querySelector("#prepare-button");
const emptyPrepareButton = document.querySelector("#empty-prepare-button");
const sendButton = document.querySelector("#send-button");
const messageActions = document.querySelector("#message-actions");
const statusLegend = document.querySelector("#status-legend");
const emptyState = document.querySelector("#empty-state");
const dateSeparator = document.querySelector("#date-separator");
const messageList = document.querySelector("#message-list");
const conversation = document.querySelector("#conversation");
const backdrop = document.querySelector("#sheet-backdrop");
const infoSheet = document.querySelector("#info-sheet");
const messageSheet = document.querySelector("#message-sheet");
const messageDetailContent = document.querySelector("#message-detail-content");
const infoAzureStatus = document.querySelector("#info-azure-status");
const infoPreparedCount = document.querySelector("#info-prepared-count");
const infoQueuedCount = document.querySelector("#info-queued-count");
const infoLastResult = document.querySelector("#info-last-result");

let azureConfigured = false;
let currentMessages = [];
let preparedCount = 0;
let queuedCount = 0;
let lastResult = "Vista previa local. Estos mensajes todavía no se han enviado a Azure.";
let activeSheet = null;
let lastFocusedElement = null;

/**
 * Escapa texto dinámico antes de construir HTML.
 * @param {string} value Texto recibido desde el backend.
 * @returns {string} Texto seguro para insertar.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Actualiza el resultado global que se muestra en la barra inferior y en el panel de información.
 * @param {string} message Mensaje de resultado.
 * @param {boolean} isError Indica si debe mostrarse como error.
 */
function setResult(message, isError = false) {
  lastResult = message;
  statusLegend.textContent = message;
  statusLegend.classList.toggle("result-error", isError);
  infoLastResult.textContent = message;
}

/**
 * Mantiene sincronizado el estado de Azure sin revelar la conexión SAS.
 * @param {boolean} configured Indica si el backend tiene la configuración mínima.
 */
function setConnectionState(configured) {
  azureConfigured = configured;
  connectionStatus.textContent = configured ? "Azure conectado" : "Modo local";
  connectionStatus.classList.toggle("connected", configured);
  connectionStatus.classList.toggle("local", !configured);
  sendButton.disabled = !configured;
  infoAzureStatus.textContent = configured ? "Azure conectado" : "Modo local";

  if (!configured) {
    setResult("Vista previa local · No enviado a Azure");
  } else if (queuedCount === 0) {
    setResult("Listo para enviar a Azure");
  }
}

/**
 * Envía una petición al backend local y transforma errores HTTP en mensajes claros.
 * @param {string} url Endpoint local.
 * @param {RequestInit} options Opciones de fetch.
 * @returns {Promise<object>} JSON de respuesta.
 */
async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || "La operación no pudo completarse.");
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Consulta el estado del backend. La respuesta solo indica disponibilidad, no credenciales.
 */
async function loadStatus() {
  try {
    const status = await fetchJson("/api/estado");
    setConnectionState(Boolean(status.azureConfigured));
  } catch {
    setConnectionState(false);
    setResult("No se pudo consultar el estado del servidor local.", true);
  }
}

/**
 * Normaliza el mensaje para tener un único modelo visual y técnico.
 * @param {object} message Mensaje local o resultado real del backend.
 * @param {number} index Posición dentro del lote.
 * @param {string} state Estado completo del mensaje.
 * @returns {object} Modelo usado por la burbuja y el panel de detalles.
 */
function toMessageModel(message, index, state) {
  const messageId = message.messageId || message.azureMessageId;

  return {
    number: index + 1,
    subject: message.subject,
    description: message.description || "Mensaje consecutivo enviado para demostrar Azure Service Bus.",
    sentAt: message.sentAt,
    sender: message.sender || "AplicacionEmisora",
    createdBy: message.createdBy || "Kenneth",
    contentType: message.contentType || "application/json",
    bodyMessageId: message.bodyMessageId || messageId,
    azureMessageId: message.azureMessageId || messageId,
    messageId,
    state
  };
}

function compactState(state) {
  if (state === "Enviado a la cola") return "✓ Enviado a la cola";
  if (state === "Error de envío") return "! Error";
  return "◷ Preparado";
}

/**
 * Renderiza la conversación principal sin datos técnicos visibles.
 * @param {object[]} messages Mensajes recibidos.
 * @param {string} state Estado aplicado al lote.
 */
function renderMessages(messages, state) {
  currentMessages = messages.map((message, index) => toMessageModel(message, index, state));
  messageList.innerHTML = "";
  emptyState.hidden = currentMessages.length > 0;
  dateSeparator.hidden = currentMessages.length === 0;
  messageActions.hidden = currentMessages.length === 0;

  if (currentMessages.length > 0) {
    emptyState.replaceChildren();
  }

  for (const message of currentMessages) {
    const date = new Date(message.sentAt);
    const displayTime = Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });

    const bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "message-bubble";
    bubble.dataset.messageNumber = String(message.number);
    bubble.setAttribute("aria-label", `Abrir detalles de ${message.subject}`);
    bubble.innerHTML = `
      <h2>${escapeHtml(message.subject)}</h2>
      <p>${escapeHtml(message.description)}</p>
      <div class="bubble-meta">
        <time datetime="${escapeHtml(message.sentAt)}">${escapeHtml(displayTime)}</time>
        <span class="status-text">${escapeHtml(compactState(message.state))}</span>
      </div>
    `;
    bubble.addEventListener("click", () => openMessageDetails(message));
    messageList.appendChild(bubble);
  }

  conversation.scrollTop = conversation.scrollHeight;
}

/**
 * Actualiza las métricas que solo se muestran dentro del panel de información.
 */
function syncInfoPanel() {
  infoPreparedCount.textContent = String(preparedCount);
  infoQueuedCount.textContent = String(queuedCount);
  infoLastResult.textContent = lastResult;
}

/**
 * Abre un panel inferior y mueve el foco a su botón de cierre.
 * @param {HTMLElement} sheet Panel que se abrirá.
 */
function openSheet(sheet) {
  closeSheets(false);
  lastFocusedElement = document.activeElement;
  activeSheet = sheet;
  backdrop.hidden = false;
  sheet.hidden = false;
  sheet.querySelector("[data-close-sheet]")?.focus();
}

/**
 * Cierra paneles inferiores y devuelve el foco al control que los abrió.
 * @param {boolean} restoreFocus Indica si debe restaurarse el foco anterior.
 */
function closeSheets(restoreFocus = true) {
  backdrop.hidden = true;
  infoSheet.hidden = true;
  messageSheet.hidden = true;
  activeSheet = null;

  if (restoreFocus && lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
}

/**
 * Muestra los detalles técnicos fuera del flujo visual de la conversación.
 * @param {object} message Mensaje seleccionado.
 */
function openMessageDetails(message) {
  const wasSent = message.state === "Enviado a la cola";
  const note = wasSent
    ? "Este mensaje fue confirmado por el backend como enviado a la cola."
    : "Este mensaje solo fue generado para vista previa local; todavía no se ha enviado a Azure.";
  const matches = message.bodyMessageId === message.azureMessageId ? "Sí, coinciden" : "No coinciden";

  messageDetailContent.innerHTML = `
    <dl>
      <div><dt>UUID</dt><dd>${escapeHtml(message.messageId)}</dd></div>
      <div><dt>Fecha ISO</dt><dd>${escapeHtml(message.sentAt)}</dd></div>
      <div><dt>Sender</dt><dd>${escapeHtml(message.sender)}</dd></div>
      <div><dt>CreatedBy</dt><dd>${escapeHtml(message.createdBy)}</dd></div>
      <div><dt>Content-Type</dt><dd>${escapeHtml(message.contentType)}</dd></div>
      <div><dt>body.messageId</dt><dd>${escapeHtml(message.bodyMessageId)}</dd></div>
      <div><dt>azure.messageId</dt><dd>${escapeHtml(message.azureMessageId)}</dd></div>
      <div><dt>Estado real</dt><dd>${escapeHtml(message.state)}</dd></div>
      <div><dt>Correspondencia</dt><dd>${escapeHtml(matches)}</dd></div>
      <div><dt>Aclaración</dt><dd>${escapeHtml(note)}</dd></div>
    </dl>
  `;

  openSheet(messageSheet);
}

/**
 * Genera una vista previa local. No toca Azure ni declara envío real.
 */
async function prepareMessages() {
  prepareButton.disabled = true;
  emptyPrepareButton.disabled = true;
  setResult("Preparando vista previa local...");

  try {
    const data = await fetchJson("/api/vista-previa", { method: "POST" });
    preparedCount = data.generatedCount;
    queuedCount = 0;
    renderMessages(data.messages, "Preparado localmente");
    syncInfoPanel();
    setResult("Vista previa local · No enviado a Azure");
  } catch (error) {
    setResult(error.message, true);
  } finally {
    prepareButton.disabled = false;
    emptyPrepareButton.disabled = false;
    await loadStatus();
    syncInfoPanel();
  }
}

/**
 * Solicita el envío real al backend. No reintenta el lote completo tras fallos parciales.
 */
async function sendBatch() {
  if (!azureConfigured) {
    setResult("Vista previa local · No enviado a Azure", true);
    return;
  }

  sendButton.disabled = true;
  renderMessages(currentMessages, "Enviando a Azure");
  setResult("Enviando lote a Azure...");

  try {
    const data = await fetchJson("/api/enviar", { method: "POST" });
    queuedCount = data.sentCount;
    renderMessages(data.results, "Enviado a la cola");
    setResult(data.finalResult);
  } catch (error) {
    queuedCount = error.data && Number.isInteger(error.data.sentCount) ? error.data.sentCount : 0;
    renderMessages(error.data?.results?.length > 0 ? error.data.results : currentMessages, "Error de envío");
    setResult(error.message, true);
  } finally {
    await loadStatus();
    syncInfoPanel();
  }
}

prepareButton.addEventListener("click", prepareMessages);
emptyPrepareButton.addEventListener("click", prepareMessages);
sendButton.addEventListener("click", sendBatch);
infoButton.addEventListener("click", () => {
  syncInfoPanel();
  openSheet(infoSheet);
});
backdrop.addEventListener("click", () => closeSheets());
document.querySelectorAll("[data-close-sheet]").forEach((button) => {
  button.addEventListener("click", () => closeSheets());
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeSheet) {
    closeSheets();
  }
});

await loadStatus();
syncInfoPanel();
