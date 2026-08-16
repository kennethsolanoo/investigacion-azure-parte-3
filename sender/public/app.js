const stateElement = document.querySelector("#azure-status");
const previewButton = document.querySelector("#preview-button");
const sendButton = document.querySelector("#send-button");
const generatedCountElement = document.querySelector("#generated-count");
const sentCountElement = document.querySelector("#sent-count");
const resultMessageElement = document.querySelector("#result-message");
const messagesBody = document.querySelector("#messages-body");

function setResult(message, isError = false) {
  resultMessageElement.textContent = message;
  resultMessageElement.style.color = isError ? "#b42318" : "#1f2937";
}

function setAzureState(azureConfigured, status) {
  stateElement.textContent = status;
  stateElement.classList.toggle("status-on", azureConfigured);
  stateElement.classList.toggle("status-off", !azureConfigured);
  sendButton.disabled = !azureConfigured;

  if (!azureConfigured) {
    setResult("Falta configurar la conexion SAS Send para habilitar el envio real a Azure.");
  }
}

function renderEmpty() {
  messagesBody.innerHTML = '<tr><td colspan="6" class="empty">No hay mensajes generados.</td></tr>';
}

function renderMessages(messages, status = "Generado") {
  messagesBody.innerHTML = "";

  for (const [index, message] of messages.entries()) {
    const row = document.createElement("tr");
    const date = new Date(message.sentAt);
    const statusClass = status === "Enviado" ? "sent" : status === "Error" ? "error" : "generated";

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${message.subject}</td>
      <td class="uuid">${message.messageId}</td>
      <td>${Number.isNaN(date.getTime()) ? message.sentAt : date.toLocaleString("es-CR")}</td>
      <td>${message.description}</td>
      <td><span class="badge ${statusClass}">${status}</span></td>
    `;

    messagesBody.appendChild(row);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || "La operacion no pudo completarse.");
    error.data = data;
    throw error;
  }

  return data;
}

async function loadStatus() {
  try {
    const status = await fetchJson("/api/estado");
    setAzureState(status.azureConfigured, status.status);
  } catch {
    setAzureState(false, "Azure no configurado");
    setResult("No se pudo consultar el estado del backend local.", true);
  }
}

async function generatePreview() {
  previewButton.disabled = true;
  setResult("Generando vista previa local...");

  try {
    const data = await fetchJson("/api/vista-previa", { method: "POST" });
    generatedCountElement.textContent = String(data.generatedCount);
    sentCountElement.textContent = "0";
    renderMessages(data.messages, "Generado");
    setResult(`Vista previa generada: ${data.generatedCount} mensajes listos para revisar.`);
  } catch (error) {
    renderEmpty();
    setResult(error.message, true);
  } finally {
    previewButton.disabled = false;
    await loadStatus();
  }
}

async function sendMessages() {
  sendButton.disabled = true;
  setResult("Enviando mensajes a Azure Service Bus...");

  try {
    const data = await fetchJson("/api/enviar", { method: "POST" });
    sentCountElement.textContent = String(data.sentCount);
    renderMessages(
      data.results.map((result) => ({
        messageId: result.messageId,
        sentAt: result.sentAt,
        subject: result.subject,
        description: "Mensaje consecutivo enviado para demostrar Azure Service Bus."
      })),
      "Enviado"
    );
    setResult(data.finalResult);
  } catch (error) {
    const sentCount = error.data && Number.isInteger(error.data.sentCount) ? error.data.sentCount : 0;
    sentCountElement.textContent = String(sentCount);
    setResult(error.message, true);
  } finally {
    await loadStatus();
  }
}

previewButton.addEventListener("click", generatePreview);
sendButton.addEventListener("click", sendMessages);

renderEmpty();
await loadStatus();
