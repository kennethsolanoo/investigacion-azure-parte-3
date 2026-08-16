import { ServiceBusClient } from "@azure/service-bus";
import { createFiveMessages, TOTAL_MESSAGES, validateEnvironment } from "./generador-mensajes.js";

export async function sendFiveMessagesToAzure(env = process.env, options = {}) {
  const missingVariables = validateEnvironment(env);

  if (missingVariables.length > 0) {
    const error = new Error("Faltan variables de entorno requeridas para enviar mensajes a Azure.");
    error.code = "CONFIGURATION_MISSING";
    error.missingVariables = missingVariables;
    error.sentCount = 0;
    throw error;
  }

  let client;
  let sender;
  let sentCount = 0;
  const results = [];

  try {
    client = new ServiceBusClient(env.AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING);
    sender = client.createSender(env.AZURE_SERVICE_BUS_QUEUE_NAME);
    const messages = createFiveMessages();

    for (const [index, message] of messages.entries()) {
      await sender.sendMessages(message);
      sentCount += 1;

      const result = {
        number: index + 1,
        messageId: message.messageId,
        subject: message.body.subject,
        sentAt: message.body.sentAt,
        status: "Enviado"
      };

      results.push(result);

      if (options.onMessageSent) {
        options.onMessageSent(result);
      }
    }

    return {
      total: TOTAL_MESSAGES,
      sentCount,
      results
    };
  } catch (error) {
    error.sentCount = sentCount;
    error.results = results;
    throw error;
  } finally {
    if (sender) {
      await sender.close();
    }

    if (client) {
      await client.close();
    }
  }
}
