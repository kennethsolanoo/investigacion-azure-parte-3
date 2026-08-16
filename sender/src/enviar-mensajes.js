/**
 * Punto de entrada de consola del emisor.
 * Conserva la prueba por terminal y reutiliza la misma lógica que usa el servidor web.
 */

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { TOTAL_MESSAGES, validateEnvironment } from "./generador-mensajes.js";
import { sendFiveMessagesToAzure } from "./enviar-azure.js";

dotenv.config({ quiet: true });

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

  try {
    const result = await sendFiveMessagesToAzure(process.env, {
      // La consola informa cada aceptación de Azure sin mostrar la cadena SAS.
      onMessageSent(message) {
        console.log(`Mensaje ${message.number} enviado correctamente.`);
        console.log(`messageId: ${message.messageId}`);
        console.log(`Asunto: ${message.subject}`);
        console.log("Confirmacion: Azure Service Bus acepto la operacion de envio.");
        console.log("");
      }
    });

    console.log(`Resultado: ${result.sentCount} de ${TOTAL_MESSAGES} mensajes enviados correctamente.`);
  } catch (error) {
    const sentCount = Number.isInteger(error.sentCount) ? error.sentCount : 0;
    console.error(`Error durante el envio. Mensajes enviados antes del fallo: ${sentCount} de ${TOTAL_MESSAGES}.`);
    console.error(`Detalle: ${error.message}`);
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (currentFile === executedFile) {
  await sendMessages();
}
