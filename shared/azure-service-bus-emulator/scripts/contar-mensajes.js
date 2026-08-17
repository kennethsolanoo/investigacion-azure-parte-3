/**
 * Consulta cuantos mensajes activos existen en academic-messages-queue dentro
 * del Azure Service Bus Emulator (local, ejecutado con Docker).
 *
 * Este script SOLO lee el conteo (getQueueRuntimeProperties). No envia ni
 * consume mensajes, por lo que puede usarse antes y despues de la prueba sin
 * alterar el resultado.
 *
 * Requiere una variable de entorno local (no versionada) con la cadena de
 * conexion del emulador, por ejemplo en shared/azure-service-bus-emulator/.env:
 *
 *   AZURE_SERVICE_BUS_LOCAL_CONNECTION_STRING=Endpoint=sb://localhost;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=SAS_KEY_VALUE;UseDevelopmentEmulator=true;
 *
 * Esta es la cadena de conexion ESTATICA y publica que documenta Microsoft
 * para el emulador (no es un secreto real; el emulador no valida la clave).
 */

import dotenv from "dotenv";
import { ServiceBusAdministrationClient } from "@azure/service-bus";

dotenv.config({ quiet: true });

const QUEUE_NAME = process.env.AZURE_SERVICE_BUS_QUEUE_NAME || "academic-messages-queue";
const CONNECTION_STRING = process.env.AZURE_SERVICE_BUS_LOCAL_CONNECTION_STRING;

if (!CONNECTION_STRING) {
  console.error("Falta AZURE_SERVICE_BUS_LOCAL_CONNECTION_STRING en el entorno local.");
  console.error("Cree shared/azure-service-bus-emulator/.env a partir de .env.example y agregue la variable.");
  process.exit(1);
}

async function main() {
  const adminClient = new ServiceBusAdministrationClient(CONNECTION_STRING);

  try {
    const runtimeProperties = await adminClient.getQueueRuntimeProperties(QUEUE_NAME);

    console.log(`Cola: ${QUEUE_NAME}`);
    console.log(`Fecha de la consulta: ${new Date().toISOString()}`);
    console.log(`Mensajes activos: ${runtimeProperties.activeMessageCount}`);
    console.log(`Mensajes en carta muerta: ${runtimeProperties.deadLetterMessageCount}`);
    console.log(`Mensajes totales: ${runtimeProperties.totalMessageCount}`);
  } catch (error) {
    console.error(`No fue posible consultar la cola: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
