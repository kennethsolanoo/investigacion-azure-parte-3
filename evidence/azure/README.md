# evidence/azure/

Esta carpeta almacena la evidencia de la infraestructura de Francisco: Docker
ejecutando el Azure Service Bus Emulator y la prueba de los cinco mensajes.

Los archivos de evidencia (conteos de mensajes, salida del emisor y del
receptor, logs del contenedor) se generan ejecutando

```bash
bash shared/azure-service-bus-emulator/scripts/run-prueba-integrada.sh
```

desde la raiz del repositorio, en una maquina con Docker disponible. El
detalle de que archivo corresponde a cada paso esta en
[`docs/evidencias.md`](../../docs/evidencias.md).

No se incluyen capturas de Azure Portal: esta implementacion usa el emulador
local, no Azure en la nube.
