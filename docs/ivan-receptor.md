# Aplicacion receptora de mensajes

## Proposito

La aplicacion receptora tiene como objetivo conectarse a Azure Service Bus, escuchar la cola `academic-messages-queue` y consumir los mensajes colocados por la aplicacion emisora (desarrollada por Kenneth). Esta parte demuestra el segundo tramo del flujo del proyecto: una aplicacion independiente recibe, valida y confirma el procesamiento de los mensajes generados por otro integrante del equipo.

## Tecnologias y versiones utilizadas

```text
Node.js v24.19.0
npm 11.17.0
```

La aplicacion utiliza Node.js como entorno de ejecucion, el paquete oficial `@azure/service-bus` para comunicarse con Azure Service Bus y `dotenv` para cargar variables de entorno desde un archivo local no versionado.

## Dependencias instaladas

Las dependencias del receptor estan registradas en `receiver/package.json` y `receiver/package-lock.json`:

```json
"dependencies": {
  "@azure/service-bus": "^7.9.4",
  "dotenv": "^16.4.5"
}
```

Las versiones exactas quedan registradas en `package-lock.json`.

## Configuracion mediante variables de entorno

El receptor lee exclusivamente estas variables:

```env
AZURE_SERVICE_BUS_RECEIVER_CONNECTION_STRING=
AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue
```

La cadena de conexion debe pertenecer a una politica SAS con permiso unicamente `Listen`. No debe utilizarse `RootManageSharedAccessKey` ni una politica con permiso `Send`, porque el receptor no necesita colocar mensajes en la cola, solo consumirlos.

El archivo `receiver/.env` existe solo de forma local. No se incluye en Git (esta excluido mediante `.gitignore`) y no aparece en capturas ni en el repositorio.

## Conexion con Azure Service Bus

El codigo importa `ServiceBusClient` desde el paquete oficial `@azure/service-bus`. Con la cadena de conexion local crea un cliente y luego un receptor asociado a la cola configurada, en modo `peekLock`:

```js
const sbClient = new ServiceBusClient(connectionString);
const receiver = sbClient.createReceiver(queueName, { receiveMode: 'peekLock' });
```

El modo `peekLock` significa que, al recibir un mensaje, este queda bloqueado temporalmente para otros consumidores pero no se elimina de la cola de inmediato. Solo se elimina definitivamente cuando el programa confirma explicitamente que lo proceso con exito (`completeMessage`). Si el programa fallara antes de confirmar, el mensaje volveria a estar disponible en la cola en lugar de perderse.

Antes de conectarse, el programa valida que existan las variables `AZURE_SERVICE_BUS_RECEIVER_CONNECTION_STRING` y `AZURE_SERVICE_BUS_QUEUE_NAME`. Si falta alguna, muestra un error y termina sin intentar conectarse, evitando fallos poco claros.

## Recepcion de multiples mensajes (lectura continua)

A partir de la actualizacion del equipo, el emisor envia cinco mensajes consecutivos en lugar de uno solo. El receptor se adapto para leerlos todos en una misma ejecucion, sin perder ninguno:

```js
while (seguirEscuchando) {
  const messages = await receiver.receiveMessages(BATCH_SIZE, {
    maxWaitTimeInMs: MAX_WAIT_TIME_MS,
  });

  if (messages.length === 0) {
    seguirEscuchando = false;
    break;
  }

  for (const msg of messages) {
    // procesar cada mensaje individualmente
  }
}
```

El programa pide mensajes en lotes de hasta 10 (mas que suficiente para los 5 de la prueba). Si en un lote no llega ningun mensaje nuevo dentro de un tiempo de espera de 10 segundos, el programa entiende que ya no hay mas mensajes pendientes y detiene la escucha automaticamente. Este es el "mecanismo sencillo" acordado con el grupo para cerrar el receptor sin necesidad de detenerlo manualmente.

Cada mensaje recibido se muestra completo en consola con su JSON, tal como llega:

```js
console.log(JSON.stringify(msg.body, null, 2));
```

## Contador de mensajes procesados

El receptor lleva dos contadores locales que se actualizan mensaje por mensaje:

```js
let processedCount = 0;
let errorCount = 0;
const receivedUuids = [];
```

Cada vez que un mensaje se valida y se completa correctamente, `processedCount` aumenta y su `messageId` se agrega a `receivedUuids`. Si un mensaje falla la validacion, `errorCount` aumenta en su lugar. Al finalizar la escucha, el programa imprime un resumen con el total de mensajes procesados, el total de errores y la lista ordenada de los `messageId` recibidos, para poder compararla con los UUID que reporta Kenneth desde el emisor.

## Validacion del mensaje

El contrato acordado por el equipo define seis campos obligatorios:

```json
{
  "messageId": "uuid-v4",
  "sentAt": "fecha ISO 8601",
  "sender": "AplicacionEmisora",
  "subject": "Solicitud creada",
  "description": "Se registro una nueva solicitud.",
  "createdBy": "Kenneth"
}
```

La funcion `validateMessage` verifica que ninguno de esos campos falte ni este vacio:

```js
const REQUIRED_FIELDS = ['messageId', 'sentAt', 'sender', 'subject', 'description', 'createdBy'];

function validateMessage(body) {
  const missing = REQUIRED_FIELDS.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  );
  return { valid: missing.length === 0, missing };
}
```

Si un campo falta, el receptor no completa el mensaje: lo abandona con `receiver.abandonMessage(msg)`, lo que lo devuelve a la cola para que no se pierda silenciosamente, y muestra en consola cuales campos faltaron.

## Forma en que se completa el mensaje

Un mensaje solo se marca como procesado despues de pasar la validacion:

```js
if (valid) {
  await receiver.completeMessage(msg);
  processedCount++;
  receivedUuids.push(msg.body.messageId);
}
```

`completeMessage` le indica a Azure Service Bus que el mensaje fue procesado con exito y puede eliminarse definitivamente de la cola. Esto asegura que un mensaje nunca se de por completado si no cumplio con el formato acordado.

## Manejo de errores

Si ocurre un error de conexion o durante la recepcion, el programa lo muestra en consola de forma legible, sin exponer la cadena de conexion. Los errores de validacion se muestran indicando exactamente que campos faltaron, y los errores al completar un mensaje se reportan por separado sin detener el resto del procesamiento.

## Cierre de conexiones

El receptor y el cliente de Azure se cierran dentro de un bloque `finally`, para garantizar que la conexion se cierre correctamente incluso si ocurre un error:

```js
finally {
  await receiver.close();
  await sbClient.close();
}
```

## Procedimiento de prueba

[COMPLETAR MAÑANA: describir aqui la prueba real realizada, por ejemplo:]

```text
1. Francisco coloco manualmente / Kenneth envio con el emisor N mensajes de prueba en academic-messages-queue.
2. Se ejecuto: node index.js (dentro de la carpeta receiver)
3. El receptor se conecto correctamente a Azure Service Bus.
4. Se recibieron los N mensajes, mostrando su JSON completo en consola.
5. Se validaron los N mensajes contra el contrato acordado.
6. Se completaron los N mensajes validos.
7. Se confirmo en Azure Portal que la cola quedo con cero mensajes activos.
```

## Resultado real obtenido

[COMPLETAR MAÑANA: pegar aqui el resumen final que muestra la consola, por ejemplo el bloque de "Resumen final" con processedCount, errorCount y la lista de UUID recibidos]

## Evidencias

Guardadas en `evidence/receiver/`:

- [ ] Captura de la consola recibiendo los mensajes.
- [ ] JSON recibido (de al menos un mensaje, o los cinco).
- [ ] Confirmacion del procesamiento (resumen final con contador).
- [ ] Evidencia de la cola despues del consumo (Azure Portal, cero mensajes activos).
- [ ] Fragmento importante del codigo.

## Inconvenientes y soluciones

[COMPLETAR MAÑANA: por ejemplo, si hubo que instalar Node.js, resolver el bloqueo de ejecucion de scripts de PowerShell (Set-ExecutionPolicy), esperar la cadena de conexion de Francisco, etc.]

## Conclusiones parciales

[COMPLETAR MAÑANA: reflexion breve sobre lo aprendido: manejo de peekLock, validacion de contratos, lectura de multiples mensajes en una cola, etc.]

## Uso de IA

[COMPLETAR: indicar si se uso una IA como apoyo, para que exactamente, y aclarar que no se compartieron credenciales ni cadenas de conexion reales durante su uso]

## Referencias

Microsoft. (2024, junio 11). *Azure Service Bus client library for JavaScript*. Microsoft Learn. https://learn.microsoft.com/en-us/javascript/api/overview/azure/service-bus-readme

Microsoft. (2025, junio 13). *Get started with Azure Service Bus queues (JavaScript)*. Microsoft Learn. https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-nodejs-how-to-use-queues

Microsoft. (2026, marzo 13). *Introduction to Azure Service Bus Messaging*. Microsoft Learn. https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview
