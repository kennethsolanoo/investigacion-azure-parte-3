# Azure Service Bus - Parte 3

Proyecto academico para demostrar la comunicacion entre dos aplicaciones diferentes mediante una cola de Azure Service Bus.

El repositorio inicia solo con la estructura comun. El emisor y el receptor deben desarrollarse por separado por los integrantes asignados.

## Contrato fijo

El contrato compartido esta definido en `shared/message-contract.md` y no debe modificarse despues de aprobado.

Cola propuesta:

```text
academic-messages-queue
```

Mensaje JSON:

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

El valor de `messageId` debe ser el mismo dentro del JSON y en la propiedad `messageId` del mensaje enviado mediante Azure Service Bus.

## Version local documentada

En este equipo se confirmo:

```text
Node.js v24.14.1
```

Los integrantes deben documentar la version usada al ejecutar sus pruebas. En PowerShell, si `npm` queda bloqueado por la politica de ejecucion, usar `npm.cmd`.

## Cambio de implementacion: Azure Service Bus Emulator local (Docker)

Este proyecto se planteo originalmente contra un namespace real de Azure
Service Bus en la nube. Para las pruebas del equipo se decidio usar el
**Azure Service Bus Emulator** de Microsoft, ejecutado localmente mediante
Docker, en lugar de un recurso de Azure en la nube. Esto significa que:

- No se usa un namespace real de Azure ni Azure Portal.
- No se generan ni usan claves SAS reales de Azure.
- El flujo de trabajo (cola, envio, recepcion) es el mismo que en Azure Service Bus real; solo cambia donde se ejecuta.

La configuracion de Docker y del emulador esta en
[`shared/azure-service-bus-emulator/`](shared/azure-service-bus-emulator/README.md)
y el detalle tecnico completo, incluyendo las diferencias frente a Azure
Service Bus real, en
[`docs/francisco-azure-integracion.md`](docs/francisco-azure-integracion.md).

## Seguridad

- No subir archivos `.env`.
- No incluir credenciales reales en el repositorio.
- No mostrar cadenas de conexion, claves ni credenciales en capturas.
- No usar `RootManageSharedAccessKey` en las aplicaciones.
- El emisor debe usar una politica SAS con permiso unicamente `Send`.
- El receptor debe usar una politica SAS con permiso unicamente `Listen`.

## Variables de entorno

Crear un archivo `.env` local a partir de `.env.example`.

Para el emisor:

```env
AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING=<cadena SAS con permiso Send>
AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue
```

Para el receptor:

```env
AZURE_SERVICE_BUS_RECEIVER_CONNECTION_STRING=<cadena SAS con permiso Listen>
AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue
```

## Division de ramas

Cada integrante debe trabajar en su propia rama y modificar solo sus archivos asignados.

| Integrante | Rama | Responsabilidad | Archivos exclusivos |
|---|---|---|---|
| Kenneth | `feature/sender-kenneth` | Aplicacion emisora | `sender/**`, `docs/kenneth-emisor.md`, `evidence/sender/**` |
| Persona 2 | `feature/receiver-persona2` | Aplicacion receptora | `receiver/**`, `docs/persona2-receptor.md`, `evidence/receiver/**` |
| Persona 3 | `feature/azure-docs-persona3` | Azure Service Bus, integracion y consolidacion | `.env.example`, `.gitignore`, `README.md`, `shared/**`, `docs/persona3-azure-integracion.md`, `docs/estructura-documento.md`, `docs/evidencias.md`, `evidence/azure/**` |

## Comandos para crear ramas

Si el repositorio aun no esta inicializado:

```powershell
git init
git add .
git commit -m "chore: add initial shared project structure"
```

Crear ramas:

```powershell
git checkout -b feature/sender-kenneth
git checkout main
git checkout -b feature/receiver-persona2
git checkout main
git checkout -b feature/azure-docs-persona3
git checkout main
```

Si la rama principal se llama `master`, reemplazar `main` por `master`.

## Ejecucion esperada

La implementacion queda pendiente para las ramas individuales.

- Kenneth debe preparar el programa que envia un mensaje a la cola.
- Persona 2 debe preparar el programa que recibe y procesa el mensaje.
- Persona 3 debe preparar Azure Service Bus, validar la integracion y consolidar el documento.

## Prueba integrada esperada

1. Verificar que la cola `academic-messages-queue` existe.
2. Confirmar que el emisor usa una cadena con permiso `Send`.
3. Confirmar que el receptor usa una cadena con permiso `Listen`.
4. Ejecutar el emisor.
5. Confirmar que el mensaje llega a la cola.
6. Ejecutar el receptor.
7. Confirmar que el receptor muestra y procesa el mensaje.
8. Confirmar que no se expusieron credenciales en codigo, documento ni capturas.
