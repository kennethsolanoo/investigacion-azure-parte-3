/**
 * Servidor Express local del emisor.
 * Sirve la interfaz web y expone endpoints seguros para vista previa y envío real.
 */

import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFiveMessageBodies, isAzureConfigured, validateEnvironment } from "./generador-mensajes.js";
import { sendFiveMessagesToAzure } from "./enviar-azure.js";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDirectory = path.join(__dirname, "..", "public");
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(publicDirectory));

app.get("/api/estado", (_request, response) => {
  // Solo se informa si la configuración existe; nunca se devuelve la conexión.
  const configured = isAzureConfigured();

  response.json({
    azureConfigured: configured,
    status: configured ? "Azure listo para enviar" : "Azure no configurado"
  });
});

app.post("/api/vista-previa", (_request, response) => {
  // La vista previa reutiliza el contrato, pero no crea ServiceBusClient ni toca Azure.
  const messages = createFiveMessageBodies();

  response.json({
    generatedCount: messages.length,
    messages
  });
});

app.post("/api/enviar", async (_request, response) => {
  const missingVariables = validateEnvironment();

  if (missingVariables.length > 0) {
    return response.status(400).json({
      ok: false,
      error: "Falta configurar la conexion SAS Send del emisor antes de enviar mensajes reales.",
      missingVariables,
      sentCount: 0
    });
  }

  try {
    const result = await sendFiveMessagesToAzure();

    return response.json({
      ok: true,
      sentCount: result.sentCount,
      total: result.total,
      results: result.results,
      finalResult: `${result.sentCount} de ${result.total} mensajes enviados a la cola.`
    });
  } catch (error) {
    const sentCount = Number.isInteger(error.sentCount) ? error.sentCount : 0;

    return response.status(500).json({
      ok: false,
      error: "Ocurrio un error durante el envio a Azure Service Bus.",
      detail: error.message,
      sentCount,
      results: error.results || []
    });
  }
});

const server = app.listen(port, () => {
  console.log(`La aplicacion esta disponible en http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`No se pudo iniciar el servidor: el puerto ${port} ya esta en uso.`);
    console.error("Cierre el proceso que usa ese puerto o defina otro puerto local con la variable PORT.");
    process.exitCode = 1;
    return;
  }

  console.error(`No se pudo iniciar el servidor: ${error.message}`);
  process.exitCode = 1;
});
