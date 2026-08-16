/**
 * Envía el lote obligatorio de cinco mensajes a Azure Service Bus.
 * La conexión se crea solo en el backend para que la cadena SAS nunca llegue al navegador.
 */

import { ServiceBusClient } from "@azure/service-bus";
import { createFiveMessages, TOTAL_MESSAGES, validateEnvironment } from "./generador-mensajes.js";

/**
 * Envía exactamente cinco mensajes a la cola configurada.
 * @param {NodeJS.ProcessEnv | object} env Variables de entorno con conexión SAS Send y cola.
 * @param {{ onMessageSent?: Function }} options Opciones para reportar cada envío confirmado.
 * @returns {Promise<{ total: number, sentCount: number, results: object[] }>} Resultado del lote.
 * @throws {Error} Lanza error si falta configuración o si Azure rechaza una operación.
 */
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
    // ServiceBusClient y sender viven solo durante esta operación para no dejar conexiones abiertas.
    client = new ServiceBusClient(env.AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING);
    sender = client.createSender(env.AZURE_SERVICE_BUS_QUEUE_NAME);
    const messages = createFiveMessages();

    for (const [index, message] of messages.entries()) {
      await sender.sendMessages(message);
      sentCount += 1;

      const result = {
        number: index + 1,
        messageId: message.messageId,
        bodyMessageId: message.body.messageId,
        azureMessageId: message.messageId,
        subject: message.body.subject,
        description: message.body.description,
        sentAt: message.body.sentAt,
        sender: message.body.sender,
        createdBy: message.body.createdBy,
        contentType: message.contentType,
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
    // No se reintenta el lote completo: si hubo envío parcial, repetirlo podría duplicar mensajes.
    error.sentCount = sentCount;
    error.results = results;
    throw error;
  } finally {
    // finally garantiza cierre de recursos tanto en éxito como en error.
    if (sender) {
      await sender.close();
    }

    if (client) {
      await client.close();
    }
  }
}
