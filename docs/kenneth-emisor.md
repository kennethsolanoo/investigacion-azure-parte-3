# Aplicacion emisora de mensajes

## Proposito

La aplicacion emisora tiene como objetivo generar cinco mensajes academicos y colocarlos en una cola de Azure Service Bus. Esta parte demuestra el primer tramo del flujo solicitado en el proyecto: una aplicacion independiente produce mensajes para que otra aplicacion, desarrollada por otro integrante, pueda recibirlos posteriormente.

## Tecnologias y versiones utilizadas

En el equipo de trabajo se documentaron estas versiones:

```text
Node.js v24.14.1
npm 11.11.0
```

La aplicacion utiliza Node.js como entorno de ejecucion, Express para servir una interfaz web local, el paquete oficial `@azure/service-bus` para comunicarse con Azure Service Bus y `dotenv` para cargar variables de entorno desde un archivo local no versionado.

## Dependencias instaladas

Las dependencias del emisor estan registradas en `sender/package.json` y `sender/package-lock.json`:

```json
"dependencies": {
  "@azure/service-bus": "^7.9.5",
  "dotenv": "^17.4.2",
  "express": "^5.2.1"
}
```

Las versiones exactas quedan registradas en `package-lock.json`, que forma parte de la entrega de Kenneth.

## Configuracion mediante variables de entorno

El emisor lee exclusivamente estas variables:

```env
AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING=
AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue
```

La cadena de conexion debe pertenecer a una politica SAS con permiso unicamente `Send`. No debe utilizarse `RootManageSharedAccessKey`, porque esa politica otorga permisos administrativos que no son necesarios para una aplicacion que solo envia mensajes.

El archivo `sender/.env` debe existir solo de forma local. No se incluye en Git y no debe aparecer en capturas, documento final ni repositorio.

## Adaptacion con interfaz web tipo mensajeria

La aplicacion fue ampliada con una interfaz web local que se abre en:

```text
http://localhost:3000
```

La interfaz se rediseño como una aplicacion de mensajeria tipo telefono. La pantalla muestra a `Receptor Azure` como destinatario, identifica a Iván como aplicacion receptora y representa visualmente el flujo:

```text
Kenneth prepara 5 mensajes
Azure Service Bus los almacena en una cola
Iván los recibe posteriormente
```

La arquitectura tecnica sigue siendo sencilla:

```text
Navegador
Servidor local Node.js/Express
Azure Service Bus
```

El navegador nunca recibe la cadena de conexion. La credencial permanece en el backend y solo se utiliza cuando el usuario solicita un envio real.

## Diferencia entre vista previa y envio real

La interfaz tiene dos acciones principales:

- `Preparar 5 mensajes`: genera cinco mensajes localmente y los muestra como burbujas salientes. No se conecta a Azure ni envia mensajes reales.
- `Enviar lote a Azure`: queda deshabilitado mientras falte la configuracion SAS `Send`. Cuando exista la configuracion, el backend genera y envia exactamente cinco mensajes.

El endpoint `GET /api/estado` solo indica si la configuracion requerida existe. No devuelve variables, fragmentos de conexion ni secretos.

El endpoint `POST /api/vista-previa` reutiliza la generacion de mensajes del emisor y devuelve cinco mensajes para mostrarlos en la interfaz.

El endpoint `POST /api/enviar` valida la configuracion antes de conectarse. Si falta la cadena SAS, responde con un error controlado y no intenta enviar.

## Conexion con Azure Service Bus

El codigo importa `ServiceBusClient` desde el paquete oficial `@azure/service-bus`. Con la cadena de conexion local crea un cliente y luego un emisor asociado a la cola configurada:

```js
const client = new ServiceBusClient(connectionString);
const sender = client.createSender(queueName);
```

Antes de conectarse, el programa valida que existan las variables requeridas. Si falta alguna, muestra solamente el nombre de la variable faltante y evita imprimir valores sensibles.

## Generacion de los cinco mensajes

Cada mensaje se genera con la misma estructura acordada para el emisor:

```json
{
  "messageId": "uuid-v4",
  "sentAt": "fecha ISO 8601",
  "sender": "AplicacionEmisora",
  "subject": "Mensaje 1 de 5",
  "description": "Mensaje consecutivo enviado para demostrar Azure Service Bus.",
  "createdBy": "Kenneth"
}
```

El campo `subject` cambia segun el numero de mensaje, desde `Mensaje 1 de 5` hasta `Mensaje 5 de 5`. Los demas campos se conservan.

## Uso del UUID

El identificador se genera con `crypto.randomUUID()` de Node.js. Ese mismo valor se coloca en dos lugares:

```js
body.messageId
messageId: body.messageId
```

Esto permite relacionar el mensaje que aparece en la consola del emisor con el mensaje que luego recibira la aplicacion receptora.

La interfaz web muestra el asunto, descripcion, hora y estado de cada mensaje. Los UUID y campos internos no dominan la pantalla principal; quedan dentro de la opcion `Ver detalles tecnicos`. En un envio real, ese UUID es tambien la propiedad `messageId` del mensaje enviado mediante Azure Service Bus.

## Envio consecutivo

El emisor crea cinco mensajes y los envia uno por uno con `await sender.sendMessages(message)`. No se agregan pausas artificiales entre envios. Despues de cada operacion exitosa se muestra el numero del mensaje, el `messageId`, el asunto y una confirmacion de que Azure Service Bus acepto el envio.

## Manejo de errores

Si ocurre un error durante el envio, el programa informa cuantos mensajes fueron enviados antes del fallo y establece un codigo de salida de error. El mensaje de error se muestra sin revelar la cadena de conexion.

## Cierre de conexiones

El emisor y el cliente de Azure se cierran dentro de un bloque `finally`:

```js
finally {
  await sender.close();
  await client.close();
}
```

Esto evita dejar conexiones o procesos abiertos cuando la aplicacion termina, incluso si ocurre un fallo.

## Procedimiento de prueba

Pruebas locales realizadas sin credenciales de Azure:

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run test:local
npm.cmd start
```

Las dos primeras verifican sintaxis y construccion local de mensajes. La prueba local confirma que se generan cinco mensajes con UUID diferentes y que el `messageId` del cuerpo coincide con la propiedad `messageId` del mensaje de Azure Service Bus.

La ejecucion de `npm.cmd start` levanta la interfaz local. Sin una conexion SAS real, la pagina muestra `Modo local`, permite preparar una vista previa local y mantiene deshabilitado el envio real.

La consola se conserva mediante:

```powershell
npm.cmd run enviar:consola
```

Sin `sender/.env` real, la consola valida que el programa detecta variables faltantes y termina sin imprimir secretos.

## Resultado real obtenido

La implementacion quedo completada y las verificaciones locales se ejecutaron correctamente. La interfaz web se probo en modo local mostrando `Azure no configurado` y generando cinco mensajes de vista previa. La prueba real contra Azure Service Bus queda pendiente porque no hay una cadena de conexion real en `sender/.env` al momento de esta entrega.

Cuando Kenneth coloque localmente la cadena SAS con permiso `Send`, debe ejecutar:

```powershell
cd sender
npm.cmd run enviar:consola
```

Si Azure acepta los cinco envios, la consola debe mostrar:

```text
Resultado: 5 de 5 mensajes enviados correctamente.
```

## Evidencias pendientes

No se fabricaron evidencias. Cuando exista la conexion real, deben tomarse estas capturas sin mostrar credenciales:

- Consola con los cinco mensajes enviados.
- Lista de los cinco UUID generados.
- Resultado `5 de 5 mensajes enviados correctamente`.
- Azure Portal mostrando cinco mensajes activos en `academic-messages-queue` mientras el receptor permanece detenido.

## Inconvenientes reales

Durante esta parte no se conto con una cadena de conexion real de Azure Service Bus, por lo que no se realizo el envio contra el servicio. Para avanzar sin exponer credenciales, se implementaron verificaciones locales que comprueban la sintaxis, la validacion de variables y la generacion correcta de los cinco mensajes.

Al adaptar la interfaz, se mantuvo separada la vista previa del envio real para evitar mensajes duplicados o intentos de conexion cuando Azure aun no esta configurado.

## Conclusiones parciales

La aplicacion emisora quedo preparada para enviar cinco mensajes consecutivos con identificadores unicos desde consola o desde una interfaz web local. La separacion por variables de entorno permite mantener las credenciales fuera del repositorio, y el uso del mismo `messageId` en el cuerpo y en la propiedad del mensaje facilita comprobar posteriormente el flujo completo con el receptor.

## Uso de IA

Se utilizo Codex como apoyo para estructurar la aplicacion emisora, preparar la documentacion de Kenneth y ejecutar verificaciones locales. No se compartieron credenciales ni cadenas de conexion en el chat.

## Referencias

Microsoft. (2024, junio 11). *Azure Service Bus client library for JavaScript*. Microsoft Learn. https://learn.microsoft.com/en-us/javascript/api/overview/azure/service-bus-readme

Microsoft. (2025, junio 13). *Get started with Azure Service Bus queues (JavaScript)*. Microsoft Learn. https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-nodejs-how-to-use-queues

Microsoft. (2026, marzo 13). *Introduction to Azure Service Bus Messaging*. Microsoft Learn. https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview
