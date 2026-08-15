# Contrato compartido del mensaje

Este contrato queda fijo para el proyecto. No debe cambiarse despues de aprobado.

## Cola

```text
academic-messages-queue
```

## Formato JSON exacto

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

## Campos obligatorios

- `messageId`
- `sentAt`
- `sender`
- `subject`
- `description`
- `createdBy`

## Regla de identificacion

El valor de `messageId` debe ser el mismo en:

- El campo `messageId` dentro del JSON.
- La propiedad `messageId` del mensaje enviado mediante Azure Service Bus.

## Variables de entorno

Emisor:

```env
AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING=<cadena SAS con permiso Send>
AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue
```

Receptor:

```env
AZURE_SERVICE_BUS_RECEIVER_CONNECTION_STRING=<cadena SAS con permiso Listen>
AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue
```

## Permisos minimos

- La aplicacion emisora debe usar una politica SAS con permiso unicamente `Send`.
- La aplicacion receptora debe usar una politica SAS con permiso unicamente `Listen`.
- Las aplicaciones no deben usar `RootManageSharedAccessKey`.
- No deben publicarse credenciales reales en el repositorio, documento o capturas.

## Bibliotecas y versiones

La implementacion debe usar una version LTS compatible de Node.js instalada en el equipo.

Version local confirmada:

```text
Node.js v24.14.1
```

Biblioteca prevista para Azure Service Bus:

```text
@azure/service-bus
```

Cada integrante debe documentar en su seccion la version exacta instalada durante sus pruebas.

## Criterios de exito

Envio exitoso:

- El emisor genera un UUID.
- El mismo UUID se usa como `messageId` del JSON y como propiedad `messageId` del mensaje de Azure Service Bus.
- El mensaje queda colocado en la cola `academic-messages-queue`.
- No se expone ninguna credencial.

Recepcion exitosa:

- El receptor lee un mensaje desde `academic-messages-queue`.
- El receptor muestra el JSON recibido.
- El receptor confirma que existen los campos obligatorios.
- El receptor procesa/completa el mensaje.
- No se expone ninguna credencial.
