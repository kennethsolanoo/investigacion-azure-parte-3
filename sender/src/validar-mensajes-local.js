import assert from "node:assert/strict";
import { createFiveMessages, validateEnvironment } from "./enviar-mensajes.js";

const messages = createFiveMessages();
const messageIds = messages.map((message) => message.messageId);
const uniqueMessageIds = new Set(messageIds);

assert.equal(messages.length, 5, "Deben generarse cinco mensajes.");
assert.equal(uniqueMessageIds.size, 5, "Cada mensaje debe tener un UUID diferente.");

for (const [index, message] of messages.entries()) {
  assert.equal(message.contentType, "application/json");
  assert.equal(message.messageId, message.body.messageId);
  assert.equal(message.body.sender, "AplicacionEmisora");
  assert.equal(message.body.subject, `Mensaje ${index + 1} de 5`);
  assert.equal(message.body.description, "Mensaje consecutivo enviado para demostrar Azure Service Bus.");
  assert.equal(message.body.createdBy, "Kenneth");
  assert.match(message.body.messageId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.doesNotThrow(() => new Date(message.body.sentAt).toISOString());
}

assert.deepEqual(
  validateEnvironment({}),
  ["AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING", "AZURE_SERVICE_BUS_QUEUE_NAME"]
);

console.log("Validacion local correcta: se generan cinco mensajes validos con UUID diferentes.");
