# Aplicacion emisora

Aplicacion de consola en Node.js para enviar cinco mensajes consecutivos a una cola de Azure Service Bus.

## Requisitos

- Node.js instalado.
- Acceso a una cola de Azure Service Bus.
- Politica SAS para el emisor con permiso unicamente `Send`.

Version documentada en este equipo:

```text
Node.js v24.14.1
npm 11.11.0
```

## Instalacion

Desde esta carpeta:

```powershell
npm.cmd install
```

En una terminal donde `npm` funcione directamente tambien puede usarse:

```powershell
npm install
```

## Configuracion

Crear el archivo local `sender/.env` con estas variables:

```env
AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING=<cadena SAS con permiso Send>
AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue
```

No usar `RootManageSharedAccessKey`. No publicar `sender/.env`, cadenas de conexion, claves SAS ni capturas donde aparezcan credenciales.

## Ejecucion

Desde `sender/`:

```powershell
npm.cmd start
```

O bien:

```powershell
npm start
```

## Resultado esperado

La aplicacion envia cinco mensajes consecutivos. Despues de cada envio muestra:

- Numero del mensaje.
- `messageId`.
- Asunto.
- Confirmacion de envio.

Al finalizar correctamente muestra:

```text
Resultado: 5 de 5 mensajes enviados correctamente.
```

Para observar los cinco mensajes activos en Azure, el receptor debe permanecer detenido inicialmente. Despues de ejecutar el emisor, revisar la cola `academic-messages-queue` en Azure Portal antes de iniciar la aplicacion receptora.

## Repetir la prueba

1. Verificar que `sender/.env` exista localmente y que la cadena sea del emisor con permiso `Send`.
2. Mantener el receptor detenido.
3. Ejecutar `npm.cmd start` desde `sender/`.
4. Confirmar en consola los cinco `messageId`.
5. Revisar en Azure Portal que los mensajes esten activos en la cola.

Cada ejecucion genera cinco UUID nuevos.

## Verificaciones locales sin Azure

Estas verificaciones no envian mensajes reales:

```powershell
npm.cmd run check
npm.cmd run test:local
```

Si faltan variables de entorno, `npm.cmd start` debe terminar con un mensaje claro sin imprimir valores sensibles.
