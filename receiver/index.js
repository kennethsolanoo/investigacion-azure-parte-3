require('dotenv').config();
const { ServiceBusClient } = require('@azure/service-bus');

// Campos obligatorios según el contrato acordado (shared/message-contract.md)
const REQUIRED_FIELDS = ['messageId', 'sentAt', 'sender', 'subject', 'description', 'createdBy'];

/**
 * Valida que el mensaje tenga todos los campos obligatorios del contrato.
 * No modifica el contrato: solo verifica que exista y no esté vacío.
 */
function validateMessage(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, missing: REQUIRED_FIELDS };
  }

  const missing = REQUIRED_FIELDS.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  );

  return { valid: missing.length === 0, missing };
}

async function main() {
  const connectionString = process.env.AZURE_SERVICE_BUS_RECEIVER_CONNECTION_STRING;
  const queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME;

  if (!connectionString || !queueName) {
    console.error('Error: faltan variables de entorno. Verifica receiver/.env');
    process.exit(1);
  }

  const sbClient = new ServiceBusClient(connectionString);
  const receiver = sbClient.createReceiver(queueName, { receiveMode: 'peekLock' });

  console.log(`Conectado a Azure Service Bus.`);
  console.log(`Escuchando la cola: ${queueName}\n`);

  // Tiempo máximo de espera sin mensajes nuevos antes de cerrar automáticamente.
  // Este es el "mecanismo sencillo" para detener el receptor sin intervención manual.
  const MAX_WAIT_TIME_MS = 10000; // 10 segundos
  const BATCH_SIZE = 10; // suficiente para traer los 5 mensajes de la prueba de una vez

  let processedCount = 0;
  let errorCount = 0;
  const receivedUuids = []; // para comparar contra los UUID reportados por el emisor

  try {
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

        const { valid, missing } = validateMessage(msg.body);

        if (valid) {
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
          console.error(`✘ Mensaje inválido. Faltan campos: ${missing.join(', ')}`);
          // Se abandona para que vuelva a estar disponible en la cola y no se pierda silenciosamente
          await receiver.abandonMessage(msg);
        }

        console.log(''); // separador visual entre mensajes
      }
    }
  } catch (err) {
    console.error(`Error durante la recepción de mensajes: ${err.message}`);
  } finally {
    await receiver.close();
    await sbClient.close();

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
