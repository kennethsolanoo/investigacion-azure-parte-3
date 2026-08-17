# Aplicacion receptora de mensajes

## Proposito

La aplicacion receptora escucha la cola `academic-messages-queue` de Azure Service Bus, valida los mensajes producidos por la aplicacion emisora de Kenneth y confirma el procesamiento de los mensajes validos. Esta seccion documenta la implementacion original del receptor publicada por Ivan y las correcciones tecnicas de integracion agregadas posteriormente en la rama local `correccion/integracion-final-equipo`.

La prueba real con Azure todavia no se ha ejecutado en esta rama. Los resultados descritos aqui corresponden a pruebas locales sin credenciales.

## Tecnologias y dependencias

El receptor usa Node.js, `@azure/service-bus` y `dotenv`.

Dependencias declaradas en `receiver/package.json`:

```json
{
  "@azure/service-bus": "^7.9.4",
  "dotenv": "^16.4.5"
}
```

Scripts disponibles:

```powershell
npm.cmd run check
npm.cmd run test:local
npm.cmd start
```

## Variables de entorno

El receptor lee unicamente estas variables:

```env
AZURE_SERVICE_BUS_RECEIVER_CONNECTION_STRING=CADENA_SAS_LISTEN_FICTICIA_NO_REAL
AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue
```

El archivo real debe llamarse `receiver/.env`, debe existir solo localmente y no debe subirse al repositorio. La cadena de conexion debe pertenecer a una politica SAS con permiso unicamente `Listen`. No debe usarse `RootManageSharedAccessKey`.

## Flujo de recepcion

El flujo previsto es:

```text
Azure Service Bus
    -> cola academic-messages-queue
    -> aplicacion receptora de Ivan
    -> validacion del contrato
    -> completeMessage o abandonMessage
```

El programa crea un cliente de Azure Service Bus y un receptor asociado a la cola configurada:

```js
const sbClient = new ServiceBusClient(connectionString);
const receiver = sbClient.createReceiver(queueName, { receiveMode: 'peekLock' });
```

## Uso de peekLock

El receptor mantiene `receiveMode: 'peekLock'`. Este modo bloquea temporalmente el mensaje recibido, pero no lo elimina de inmediato. El mensaje se elimina solo cuando el programa llama `completeMessage` despues de validarlo.

Este modo es adecuado para la demostracion porque evita perder mensajes si ocurre un error antes del procesamiento.

## Completar y abandonar mensajes

Un mensaje valido se procesa asi:

```js
await receiver.completeMessage(msg);
```

Un mensaje invalido se registra con sus motivos y se abandona:

```js
await receiver.abandonMessage(msg);
```

`abandonMessage` devuelve el mensaje a la cola para evitar que se pierda silenciosamente. El receptor no usa `receiveAndDelete` y no completa mensajes antes de validarlos.

Como consecuencia, un mensaje invalido puede volver a entregarse hasta que Azure Service Bus alcance el limite de entregas configurado para la cola. En una prueba real, si aparecen reintentos de un mensaje invalido, se debe revisar el motivo de rechazo y decidir con el equipo si se corrige el productor, se retira el mensaje de prueba o se deja que Azure lo mueva segun su configuracion.

## Validacion del contrato

La validacion se separo en `receiver/validator.js` para poder probarla sin Azure. El validador revisa:

- Que el cuerpo sea un objeto JSON.
- Que existan los campos obligatorios `messageId`, `sentAt`, `sender`, `subject`, `description` y `createdBy`.
- Que los campos obligatorios sean cadenas de texto.
- Que `messageId` tenga formato UUID v4.
- Que `sentAt` sea una fecha ISO 8601 valida.
- Que `sender` sea `AplicacionEmisora`.
- Que `subject` y `description` sean cadenas no vacias.
- Que `createdBy` sea `Kenneth`.
- Que `contentType` sea `application/json`.
- Que `body.messageId` coincida con la propiedad `messageId` recibida desde Azure Service Bus.

El contrato compartido contiene valores concretos para `subject` y `description`, pero el emisor actual genera asuntos consecutivos `Mensaje 1 de 5` a `Mensaje 5 de 5`. Por esa ambiguedad, el receptor valida que `subject` y `description` sean cadenas no vacias sin imponer un valor literal. Esta decision debe confirmarse con el equipo antes de la fusion final.

## Comparacion de identificadores

Para cada mensaje valido, el receptor exige que:

```text
body.messageId == azure.messageId
```

En codigo, `azure.messageId` corresponde a la propiedad `messageId` del objeto recibido desde Azure Service Bus. Esta comparacion permite verificar que el identificador generado por el emisor es el mismo que viaja como propiedad del mensaje.

## Instalacion

Desde la carpeta `receiver/`:

```powershell
npm.cmd install
```

## Pruebas locales sin Azure

Las pruebas locales no usan credenciales ni se conectan a Azure:

```powershell
npm.cmd run check
npm.cmd run test:local
```

`check` valida sintaxis de:

- `index.js`
- `validator.js`
- `validar-mensajes-local.js`

`test:local` ejecuta casos de validacion para:

- Mensaje valido.
- Cinco mensajes validos con UUID distintos.
- Campo obligatorio ausente.
- UUID incorrecto.
- Fecha invalida.
- `contentType` incorrecto.
- Diferencia entre `body.messageId` y `azure.messageId`.
- `sender` incorrecto.
- `createdBy` incorrecto.
- Razones comprensibles para cada rechazo.

Resultado local verificado en la rama de integracion:

```text
Validacion local del receptor correcta: contrato, UUID, fechas, contentType e identificadores verificados.
```

## Ejecucion con Azure

Cuando Francisco o la persona responsable de Azure entregue la cadena SAS `Listen`, crear localmente `receiver/.env` a partir de `receiver/.env.example` y ejecutar:

```powershell
cd receiver
npm.cmd start
```

Si faltan variables, el receptor termina con un error controlado antes de conectarse:

```text
Error: faltan variables de entorno. Verifica receiver/.env
```

## Cierre correcto de recursos

El receptor cierra `receiver` y `ServiceBusClient` dentro de `finally`, para liberar recursos aun si ocurre un error durante la recepcion:

```js
finally {
  await receiver.close();
  await sbClient.close();
}
```

## Que puede probarse sin Azure

Sin credenciales se puede probar:

- Instalacion de dependencias.
- Sintaxis del receptor.
- Validacion local del contrato.
- Rechazo de mensajes invalidos.
- Compatibilidad local con los objetos generados por el emisor.
- Deteccion controlada de variables faltantes.

## Que depende de la infraestructura

Queda pendiente:

- Crear o confirmar la cola `academic-messages-queue`.
- Confirmar politica SAS `Listen` para Ivan.
- Ejecutar una prueba real recibiendo cinco mensajes enviados por Kenneth.
- Comparar los cinco UUID enviados y recibidos.
- Confirmar en Azure Portal que la cola queda sin mensajes activos despues del consumo.

## Evidencias pendientes

No se fabricaron evidencias. Cuando se ejecute la prueba real, Ivan debe capturar sin mostrar credenciales:

- Consola del receptor mostrando los cinco mensajes recibidos.
- Resumen final con mensajes procesados y UUID.
- Evidencia del portal antes del consumo con mensajes activos.
- Evidencia del portal despues del consumo con la cola vacia.
- Fragmento del codigo que muestra `peekLock`, `completeMessage` y `abandonMessage`.

## Inconvenientes y soluciones

PENDIENTE DE CONFIRMACION PERSONAL POR IVAN.

En esta rama de integracion solo se puede afirmar tecnicamente que faltaba una prueba local del receptor y que se agrego un validador reutilizable sin depender de Azure.

## Conclusiones parciales

PENDIENTE DE CONFIRMACION PERSONAL POR IVAN.

Como conclusion tecnica verificable, el receptor queda preparado para validar el contrato con mayor precision y para evitar la eliminacion silenciosa de mensajes invalidos.

## Uso de IA

PENDIENTE DE CONFIRMACION PERSONAL POR IVAN.

Las correcciones de validacion, pruebas locales y esta documentacion fueron preparadas como trabajo colaborativo de integracion en la rama local `correccion/integracion-final-equipo`. No deben atribuirse como trabajo individual de Ivan hasta que el las revise y acepte.

## Referencias

Microsoft. (2024, junio 11). *Azure Service Bus client library for JavaScript*. Microsoft Learn. https://learn.microsoft.com/en-us/javascript/api/overview/azure/service-bus-readme

Microsoft. (2025, junio 13). *Get started with Azure Service Bus queues (JavaScript)*. Microsoft Learn. https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-nodejs-how-to-use-queues

Microsoft. (2026, marzo 13). *Introduction to Azure Service Bus Messaging*. Microsoft Learn. https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview
