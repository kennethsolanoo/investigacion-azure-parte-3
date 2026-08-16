import { randomUUID } from "node:crypto";

export const TOTAL_MESSAGES = 5;
export const DEFAULT_DESCRIPTION = "Mensaje consecutivo enviado para demostrar Azure Service Bus.";
export const DEFAULT_SENDER = "AplicacionEmisora";
export const DEFAULT_CREATED_BY = "Kenneth";

export function validateEnvironment(env = process.env) {
  const missing = [];

  if (!env.AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING) {
    missing.push("AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING");
  }

  if (!env.AZURE_SERVICE_BUS_QUEUE_NAME) {
    missing.push("AZURE_SERVICE_BUS_QUEUE_NAME");
  }

  return missing;
}

export function isAzureConfigured(env = process.env) {
  return validateEnvironment(env).length === 0;
}

export function createMessageBody(index) {
  const messageId = randomUUID();

  return {
    messageId,
    sentAt: new Date().toISOString(),
    sender: DEFAULT_SENDER,
    subject: `Mensaje ${index} de ${TOTAL_MESSAGES}`,
    description: DEFAULT_DESCRIPTION,
    createdBy: DEFAULT_CREATED_BY
  };
}

export function createServiceBusMessage(body) {
  return {
    body,
    messageId: body.messageId,
    contentType: "application/json"
  };
}

export function createFiveMessages() {
  return Array.from({ length: TOTAL_MESSAGES }, (_, position) => {
    const body = createMessageBody(position + 1);
    return createServiceBusMessage(body);
  });
}

export function createFiveMessageBodies() {
  return createFiveMessages().map((message) => message.body);
}
