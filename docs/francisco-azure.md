# Configuracion de Azure Service Bus e integracion

## Alcance

Esta documentacion prepara la parte tecnica asignada inicialmente a Francisco: configuracion de Azure Service Bus, variables de entorno, orden de prueba integrada y evidencias esperadas. La rama remota de Francisco no contenia aportes nuevos al momento de esta integracion, por lo que este material queda como preparacion colaborativa y debe ser revisado por Francisco o por la persona con acceso autorizado a Azure.

No se crearon recursos reales de Azure durante esta preparacion. No se generaron politicas SAS reales ni cadenas de conexion.

## Objetivo de Azure Service Bus

Azure Service Bus funciona como intermediario entre dos aplicaciones independientes:

```text
Kenneth -> Azure Service Bus -> Ivan
```

La aplicacion emisora coloca cinco mensajes en una cola. La aplicacion receptora escucha esa cola, valida los mensajes y completa los que cumplan el contrato.

## Recursos esperados

Cola del proyecto:

```text
academic-messages-queue
```

El nombre real del namespace, grupo de recursos, suscripcion y region no se inventa en esta documentacion. Debe definirlo la persona responsable de Azure antes de la prueba real.

## Permisos minimos

Se requieren dos politicas SAS separadas:

- Politica para Kenneth: permiso unicamente `Send`.
- Politica para Ivan: permiso unicamente `Listen`.

Las aplicaciones no deben usar `RootManageSharedAccessKey`, porque esa politica tiene permisos administrativos innecesarios para el proyecto.

## Variables de entorno

Emisor:

```env
AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING=CADENA_SAS_SEND_FICTICIA_NO_REAL
AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue
```

Receptor:

```env
AZURE_SERVICE_BUS_RECEIVER_CONNECTION_STRING=CADENA_SAS_LISTEN_FICTICIA_NO_REAL
AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue
```

Los valores reales deben quedar solo en `sender/.env` y `receiver/.env`, archivos ignorados por Git.

## Peek y consumo

En Azure Portal, `Peek` permite observar mensajes sin consumirlos. Ejecutar el receptor si consume mensajes validos porque usa `completeMessage` despues de validarlos.

Para comprobar mensajes activos sin alterar la prueba:

1. Mantener apagado el receptor.
2. Enviar un solo lote desde el emisor.
3. Revisar en Azure Portal el conteo de mensajes activos o usar una accion de inspeccion que no complete mensajes.
4. No ejecutar herramientas que reciban y completen mensajes antes de capturar la evidencia.

## Orden exacto de la prueba integrada

1. Confirmar que la cola `academic-messages-queue` existe.
2. Confirmar que `sender/.env` contiene una cadena SAS con permiso `Send`.
3. Confirmar que `receiver/.env` contiene una cadena SAS con permiso `Listen`.
4. Verificar que el receptor esta apagado.
5. Ejecutar las pruebas locales del emisor y receptor.
6. Iniciar el emisor y preparar un lote.
7. Enviar exactamente una vez los cinco mensajes.
8. Registrar los cinco UUID emitidos sin mostrar credenciales.
9. Confirmar en Azure Portal que hay cinco mensajes activos.
10. Iniciar el receptor.
11. Confirmar que procesa exactamente cinco mensajes validos.
12. Comparar los cinco UUID recibidos contra los enviados.
13. Confirmar que la cola queda sin mensajes activos.
14. Detener las aplicaciones ordenadamente.

## Como evitar duplicados

- No presionar dos veces el boton de envio.
- No repetir `npm.cmd run enviar:consola` si hubo un fallo parcial.
- Si ocurre un error, revisar cuantos mensajes reporto el emisor como enviados antes de intentar cualquier repeticion.
- Mantener una lista de UUID para distinguir mensajes nuevos de mensajes previos.

## Envio parcial

Si el emisor reporta menos de cinco mensajes enviados:

1. No repetir automaticamente el lote.
2. Registrar cuantos mensajes fueron confirmados.
3. Revisar en Azure Portal el estado de la cola sin consumir mensajes.
4. Decidir con el equipo si se limpia la cola, se consume el lote parcial o se ejecuta una nueva prueba identificada.

## Cola vacia al final

Despues de ejecutar el receptor, confirmar en Azure Portal que no quedan mensajes activos de la prueba. Si quedan mensajes, revisar si fueron invalidos y abandonados por el receptor o si pertenecian a una prueba anterior.

Si un mensaje invalido es abandonado por el receptor, Azure puede entregarlo nuevamente hasta alcanzar el limite de entregas de la cola. Esa situacion no debe confundirse con un lote nuevo del emisor; se debe comparar el UUID y revisar el motivo de validacion reportado por Ivan.

## Cierre y eliminacion opcional

Al terminar la evaluacion, la persona responsable de Azure puede conservar los recursos para evidencias o eliminarlos si ya no son necesarios. La eliminacion debe hacerse manualmente y con confirmacion, porque podria afectar evidencias del proyecto.

## Costos

Azure Service Bus puede generar costos segun el plan y el tiempo de uso. Para una evaluacion academica conviene usar la configuracion mas economica disponible que permita colas, crear solo los recursos necesarios y eliminarlos cuando la evaluacion termine si no se requieren mas evidencias.

## Seguridad de credenciales

- No incluir cadenas SAS en repositorio, capturas o documento final.
- No compartir `RootManageSharedAccessKey`.
- Usar politicas separadas con permisos minimos.
- Guardar credenciales reales solo en `.env` locales ignorados por Git.
- No pegar credenciales en chats, correos o herramientas no autorizadas.

## Evidencias que debe capturar Francisco

Sin mostrar credenciales:

- Namespace de Service Bus creado o seleccionado.
- Cola `academic-messages-queue`.
- Politica SAS del emisor con permiso `Send`.
- Politica SAS del receptor con permiso `Listen`.
- Conteo de cinco mensajes activos despues del envio y antes del receptor.
- Cola vacia despues de que Ivan procese los mensajes.
- Registro del orden de prueba y fecha de ejecucion.

## Autoria y estado

La configuracion real y la validacion en Azure siguen pendientes de una persona con acceso autorizado. Este documento y el script `azure/provision-service-bus.ps1` son una preparacion tecnica de integracion; no deben presentarse como despliegue realizado por Francisco hasta que el lo revise, ejecute y aporte evidencias reales.
