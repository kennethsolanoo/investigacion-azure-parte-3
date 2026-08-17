# Evidencias - Azure Service Bus Emulator (local)

Este documento explica que evidencias respaldan la parte de Francisco y como
se generan. Como el proyecto usa el Azure Service Bus Emulator local (Docker)
y no Azure Portal, **no** se incluyen capturas del portal de Azure.

## Estado de esta entrega

Esta preparacion se realizo en un entorno sin Docker disponible (sin
posibilidad de iniciar contenedores ni de descargar las imagenes
`mcr.microsoft.com/azure-messaging/servicebus-emulator` y
`mcr.microsoft.com/azure-sql-edge`). Por esa razon:

- Se dejo lista toda la configuracion (`docker-compose.yml`, `Config.json`,
  `.env.example`) y el script de automatizacion de la prueba
  (`shared/azure-service-bus-emulator/scripts/run-prueba-integrada.sh`).
- **No** se generaron todavia los archivos de evidencia reales (logs de
  ejecucion, conteos de mensajes, salida del emisor y del receptor), porque
  hacerlo sin ejecutar el emulador real produciria evidencia falsa.
- `evidence/azure/` se deja con este documento y con el script listo para
  ejecutarse; los archivos de evidencia deben generarse corriendo el script
  en una maquina con Docker.

## Como generar las evidencias reales

1. Instalar Docker Desktop (o Docker Engine + Compose) y verificar que
   `docker compose version` funciona.
2. Crear `shared/azure-service-bus-emulator/.env` a partir de su
   `.env.example`.
3. Crear `sender/.env` y `receiver/.env` con la cadena de conexion local del
   emulador (ver `docs/francisco-azure-integracion.md`, seccion 7).
4. Ejecutar `npm install` dentro de `sender/`, `receiver/` y
   `shared/azure-service-bus-emulator/scripts/`.
5. Ejecutar desde la raiz del repositorio:

   ```bash
   bash shared/azure-service-bus-emulator/scripts/run-prueba-integrada.sh
   ```

6. Revisar los archivos generados en `evidence/azure/` (ver lista abajo) y
   confirmar que los conteos y mensajes coinciden con lo esperado antes de
   incluirlos en el documento final.

## Evidencias que genera el script (en `evidence/azure/`)

| Archivo | Contenido |
|---|---|
| `00-contenedores-activos.txt` | Salida de `docker compose ps`: confirma que `servicebus-emulator` y `sqledge` estan activos. |
| `01-cola-vacia-inicial.txt` | Conteo de mensajes antes del envio (debe mostrar 0 mensajes activos). |
| `02-envio-cinco-mensajes.txt` | Salida por consola del emisor: los cinco `messageId` confirmados. |
| `03-cola-cinco-mensajes.txt` | Conteo de mensajes despues del envio (debe mostrar 5 mensajes activos). |
| `04-recepcion-cinco-mensajes.txt` | Salida por consola del receptor: los cinco mensajes recibidos, validados y completados, con el resumen final. |
| `05-cola-vacia-final.txt` | Conteo de mensajes despues de la recepcion (debe volver a mostrar 0). |
| `06-logs-emulador.txt` | Logs del contenedor `servicebus-emulator` durante la prueba. |
| `07-detencion-entorno.txt` | Confirmacion de que los contenedores se detuvieron correctamente. |

## Reglas para todas las evidencias

- No deben mostrar contrasenas, claves, tokens ni cadenas de conexion
  completas. La cadena de conexion del emulador que aparece en la
  documentacion es la cadena estatica y publica que documenta Microsoft para
  desarrollo local; aun asi, en logs reales conviene recortarla si aparece.
- No se incluyen capturas de Azure Portal, porque esta implementacion no usa
  Azure Portal.
- Si algun archivo de evidencia llegara a mostrar informacion sensible por
  error, debe reemplazarse por una version segura antes de subirlo al
  repositorio.
