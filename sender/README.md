# Aplicacion emisora

Aplicacion Node.js para generar cinco mensajes consecutivos y enviarlos a una cola de Azure Service Bus. Incluye una interfaz web local para probar la vista previa sin Azure y conserva el emisor de consola.

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

## Abrir la interfaz web

Desde `sender/`:

```powershell
npm.cmd start
```

La aplicacion queda disponible en:

```text
http://localhost:3000
```

Para detener el servidor, usar `Ctrl + C` en la terminal donde esta corriendo.

## Usar la vista previa

La vista previa funciona sin Azure:

1. Abrir `http://localhost:3000`.
2. Presionar `Generar vista previa`.
3. Revisar los cinco mensajes generados localmente.

La vista previa no envia mensajes reales a Azure. Sirve para comprobar el contrato, los UUID y los asuntos antes de contar con la conexion SAS.

## Estado de Azure

La interfaz muestra uno de estos estados:

- `Azure no configurado`: falta una variable requerida, normalmente la cadena SAS `Send`.
- `Azure listo para enviar`: existen las variables requeridas para intentar el envio desde el backend.

El estado nunca muestra la cadena de conexion ni fragmentos de credenciales.

## Enviar desde la interfaz

El boton `Enviar 5 mensajes a Azure` solo queda habilitado cuando el backend detecta las variables requeridas. Si Azure aun no esta configurado, el boton permanece deshabilitado y la pagina permite probar solo la vista previa local.

## Ejecutar el emisor de consola

La aplicacion de consola se conserva con:

```powershell
npm.cmd run enviar:consola
```

O bien:

```powershell
npm run enviar:consola
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

Para observar los cinco mensajes activos en Azure, el receptor debe permanecer detenido inicialmente. Despues de ejecutar el envio real, revisar la cola `academic-messages-queue` en Azure Portal antes de iniciar la aplicacion receptora.

## Repetir la prueba

1. Verificar que `sender/.env` exista localmente y que la cadena sea del emisor con permiso `Send`.
2. Mantener el receptor detenido.
3. Ejecutar `npm.cmd run enviar:consola` desde `sender/` o usar el boton de envio en la interfaz.
4. Confirmar en consola los cinco `messageId`.
5. Revisar en Azure Portal que los mensajes esten activos en la cola.

Cada ejecucion genera cinco UUID nuevos.

## Verificaciones locales sin Azure

Estas verificaciones no envian mensajes reales:

```powershell
npm.cmd run check
npm.cmd run test:local
```

Si faltan variables de entorno, la interfaz debe mostrar `Azure no configurado` y el comando `npm.cmd run enviar:consola` debe terminar con un mensaje claro sin imprimir valores sensibles.
