const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { validateReceivedMessage } = require("./validator");

function createValidMessage(overrides = {}) {
  const messageId = overrides.messageId || randomUUID();
  const body = {
    messageId,
    sentAt: new Date("2026-08-16T18:30:00.000Z").toISOString(),
    sender: "AplicacionEmisora",
    subject: "Mensaje 1 de 5",
    description: "Mensaje consecutivo enviado para demostrar Azure Service Bus.",
    createdBy: "Kenneth",
    ...overrides.body
  };

  return {
    body,
    messageId: overrides.azureMessageId || body.messageId,
    contentType: overrides.contentType || "application/json"
  };
}

function assertInvalid(message, expectedField) {
  const result = validateReceivedMessage(message);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.field === expectedField));
  assert.ok(result.reasons.some((reason) => reason.includes(expectedField)));
}

const validResult = validateReceivedMessage(createValidMessage());
assert.equal(validResult.valid, true);
assert.deepEqual(validResult.issues, []);

const fiveMessages = Array.from({ length: 5 }, (_, index) =>
  createValidMessage({ body: { subject: `Mensaje ${index + 1} de 5` } })
);
const messageIds = fiveMessages.map((message) => message.messageId);
assert.equal(fiveMessages.length, 5);
assert.equal(new Set(messageIds).size, 5);
assert.ok(fiveMessages.every((message) => validateReceivedMessage(message).valid));

const missingField = createValidMessage();
delete missingField.body.description;
assertInvalid(missingField, "description");

const inheritedBody = Object.create({ description: "Descripcion heredada no valida" });
Object.assign(inheritedBody, createValidMessage().body);
delete inheritedBody.description;
assertInvalid({ body: inheritedBody, messageId: inheritedBody.messageId, contentType: "application/json" }, "description");

assertInvalid(createValidMessage({ body: { messageId: "uuid-no-valido" } }), "messageId");
assertInvalid(createValidMessage({ body: { messageId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8" } }), "messageId");
assertInvalid(createValidMessage({ body: { sentAt: "fecha-no-valida" } }), "sentAt");
assertInvalid(createValidMessage({ body: { sentAt: "2026-08-16" } }), "sentAt");
assertInvalid(createValidMessage({ contentType: "text/plain" }), "contentType");
assertInvalid({ ...createValidMessage(), messageId: undefined }, "azureMessageId");
assertInvalid(createValidMessage({ azureMessageId: randomUUID() }), "azureMessageId");
assertInvalid(createValidMessage({ body: { sender: "OtraAplicacion" } }), "sender");
assertInvalid(createValidMessage({ body: { createdBy: "OtraPersona" } }), "createdBy");
assertInvalid(createValidMessage({ body: { subject: "" } }), "subject");
assertInvalid(createValidMessage({ body: { subject: "   " } }), "subject");
assertInvalid(createValidMessage({ body: { description: "" } }), "description");
assertInvalid(createValidMessage({ body: { description: "   " } }), "description");
assertInvalid(null, "body");
assertInvalid({ body: null, messageId: randomUUID(), contentType: "application/json" }, "body");
assertInvalid({ body: [], messageId: randomUUID(), contentType: "application/json" }, "body");
assertInvalid({ body: "texto", messageId: randomUUID(), contentType: "application/json" }, "body");

console.log("Validacion local del receptor correcta: contrato, UUID, fechas, contentType e identificadores verificados.");
