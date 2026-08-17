require('dotenv').config();
const { ServiceBusClient } = require('@azure/service-bus');
const { validateReceivedMessage } = require('./validator');

async function main() {
  const connectionString = process.env.AZURE_SERVICE_BUS_RECEIVER_CONNECTION_STRING;
  const queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME;

  if (!connectionString || !queueName) {
    console.error('Error: faltan variables de entorno. Verifica receiver/.env');
    process.exit(1);
  }

  // Tiempo máximo de espera sin mensajes nuevos antes de cerrar automáticamente.
  // Este es el "mecanismo sencillo" para detener el receptor sin intervención manual.
  const MAX_WAIT_TIME_MS = 10000; // 10 segundos
  const BATCH_SIZE = 10; // suficiente para traer los 5 mensajes de la prueba de una vez

  let processedCount = 0;
  let errorCount = 0;
  const receivedUuids = []; // para comparar contra los UUID reportados por el emisor
  let sbClient;
  let receiver;

  try {
    sbClient = new ServiceBusClient(connectionString);
    receiver = sbClient.createReceiver(queueName, { receiveMode: 'peekLock' });

    console.log(`Conectado a Azure Service Bus.`);
    console.log(`Escuchando la cola: ${queueName}\n`);

    let seguirEscuchando = true;

    while (seguirEscuchando) {
      const messages = await receiver.receiveMessages(BATCH_SIZE, {
        maxWaitTimeInMs: MAX_WAIT_TIME_MS,
      });

      if (messages.length === 0) {
        console.log(`No llegaron más mensajes en los últimos ${MAX_WAIT_TIME_MS / 1000}s. Cerrando escucha.`);
        seguirEscuchando = false;
        break;
      }

      for (const msg of messages) {
        console.log('--- Mensaje recibido ---');
        console.log(JSON.stringify(msg.body, null, 2));

        const validation = validateReceivedMessage(msg);

        if (validation.valid) {
          try {
            await receiver.completeMessage(msg);
            processedCount++;
            receivedUuids.push(msg.body.messageId);
            console.log(`✔ Válido y completado. Total procesados hasta ahora: ${processedCount}`);
          } catch (completeErr) {
            errorCount++;
            console.error(`✘ Error al completar el mensaje: ${completeErr.message}`);
          }
        } else {
          errorCount++;
          console.error(`✘ Mensaje inválido. Motivos: ${validation.reasons.join('; ')}`);
          try {
            // Se abandona para que vuelva a estar disponible en la cola y no se pierda silenciosamente.
            await receiver.abandonMessage(msg);
          } catch (abandonErr) {
            console.error(`✘ Error al abandonar el mensaje inválido: ${abandonErr.message}`);
          }
        }

        console.log(''); // separador visual entre mensajes
      }
    }
  } catch (err) {
    console.error(`Error durante la recepción de mensajes: ${err.message}`);
  } finally {
    if (receiver) {
      await receiver.close();
    }

    if (sbClient) {
      await sbClient.close();
    }

    console.log('Conexión cerrada correctamente.');
    console.log('--- Resumen final ---');
    console.log(`Mensajes procesados correctamente: ${processedCount}`);
    console.log(`Mensajes con error: ${errorCount}`);
    console.log('UUID (messageId) recibidos, en orden de llegada:');
    receivedUuids.forEach((id, i) => console.log(`  ${i + 1}. ${id}`));
  }
}

main().catch((err) => {
  console.error(`Error inesperado: ${err.message}`);
  process.exit(1);
});
