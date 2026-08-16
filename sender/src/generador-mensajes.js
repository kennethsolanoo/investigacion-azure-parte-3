/**
 * Genera el contrato compartido del emisor.
 * Este módulo es usado por la consola, la vista previa web y el envío real para
 * evitar que existan dos versiones distintas del mensaje académico.
 */

import { randomUUID } from "node:crypto";

export const TOTAL_MESSAGES = 5;
export const DEFAULT_DESCRIPTION = "Mensaje consecutivo enviado para demostrar Azure Service Bus.";
export const DEFAULT_SENDER = "AplicacionEmisora";
export const DEFAULT_CREATED_BY = "Kenneth";

/**
 * Valida que existan las variables mínimas para enviar a Azure.
 * Solo retorna nombres de variables faltantes; nunca expone valores sensibles.
 * @param {NodeJS.ProcessEnv | object} env Fuente de variables de entorno.
 * @returns {string[]} Nombres de variables faltantes.
 */
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

/**
 * Indica si el backend tiene configuración suficiente para intentar un envío.
 * @param {NodeJS.ProcessEnv | object} env Fuente de variables de entorno.
 * @returns {boolean} Verdadero cuando las variables requeridas existen.
 */
export function isAzureConfigured(env = process.env) {
  return validateEnvironment(env).length === 0;
}

/**
 * Crea el cuerpo JSON obligatorio del mensaje.
 * El UUID se genera aquí para que cada mensaje tenga una identidad única.
 * @param {number} index Número de mensaje dentro del lote.
 * @returns {object} Cuerpo JSON que respeta el contrato del proyecto.
 */
export function createMessageBody(index) {
  // El UUID permite relacionar la burbuja local, el mensaje enviado a Azure y el receptor de Iván.
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

/**
 * Convierte el cuerpo JSON en el objeto que entiende Azure Service Bus.
 * El mismo UUID se usa en body.messageId y en messageId de Azure para comprobar correspondencia.
 * @param {object} body Cuerpo JSON ya generado.
 * @returns {object} Mensaje listo para enviar mediante @azure/service-bus.
 */
export function createServiceBusMessage(body) {
  return {
    body,
    messageId: body.messageId,
    contentType: "application/json"
  };
}

/**
 * Genera exactamente cinco mensajes, uno por cada asunto solicitado.
 * @returns {object[]} Mensajes con body, messageId y contentType.
 */
export function createFiveMessages() {
  return Array.from({ length: TOTAL_MESSAGES }, (_, position) => {
    const body = createMessageBody(position + 1);
    return createServiceBusMessage(body);
  });
}

/**
 * Devuelve solo los cuerpos JSON para la vista previa local.
 * @returns {object[]} Cinco cuerpos de mensaje sin conectarse con Azure.
 */
export function createFiveMessageBodies() {
  return createFiveMessages().map((message) => message.body);
}
