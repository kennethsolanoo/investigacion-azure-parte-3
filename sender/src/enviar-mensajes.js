import { ServiceBusClient } from "@azure/service-bus";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

dotenv.config({ quiet: true });

const TOTAL_MESSAGES = 5;
const DEFAULT_DESCRIPTION = "Mensaje consecutivo enviado para demostrar Azure Service Bus.";
const DEFAULT_SENDER = "AplicacionEmisora";
const DEFAULT_CREATED_BY = "Kenneth";

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

async function sendMessages() {
  const missingVariables = validateEnvironment();

  if (missingVariables.length > 0) {
    console.error("No se puede iniciar el emisor porque faltan variables de entorno requeridas:");
    for (const variableName of missingVariables) {
      console.error(`- ${variableName}`);
    }
    console.error("Cree sender/.env localmente y no publique credenciales en el repositorio.");
    process.exitCode = 1;
    return;
  }

  let client;
  let sender;
  let sentCount = 0;

  try {
    const connectionString = process.env.AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING;
    const queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME;
    client = new ServiceBusClient(connectionString);
    sender = client.createSender(queueName);
    const messages = createFiveMessages();

    for (const [index, message] of messages.entries()) {
      await sender.sendMessages(message);
      sentCount += 1;

      console.log(`Mensaje ${index + 1} enviado correctamente.`);
      console.log(`messageId: ${message.messageId}`);
      console.log(`Asunto: ${message.body.subject}`);
      console.log("Confirmacion: Azure Service Bus acepto la operacion de envio.");
      console.log("");
    }

    console.log(`Resultado: ${sentCount} de ${TOTAL_MESSAGES} mensajes enviados correctamente.`);
  } catch (error) {
    console.error(`Error durante el envio. Mensajes enviados antes del fallo: ${sentCount} de ${TOTAL_MESSAGES}.`);
    console.error(`Detalle: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (sender) {
      await sender.close();
    }

    if (client) {
      await client.close();
    }
  }
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (currentFile === executedFile) {
  await sendMessages();
}
