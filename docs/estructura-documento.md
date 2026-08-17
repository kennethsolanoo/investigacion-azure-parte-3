# Estructura del documento final del equipo

Este archivo consolida como deben articularse las tres partes (Kenneth, Ivan
y Francisco) en el documento/reporte final entregable, para que exista una
sola narrativa coherente y no se dupliquen ni se atribuyan mal las
responsabilidades.

## 1. Objetivo del proyecto

Redactado en conjunto. Explica que el proyecto demuestra comunicacion
asincrona entre dos aplicaciones independientes mediante una cola de Azure
Service Bus, usando el Azure Service Bus Emulator local (Docker) para las
pruebas del equipo, en lugar de un namespace real en la nube.

## 2. Arquitectura

Aporta Francisco. Diagrama general:

```text
Emisor (Kenneth) -> Azure Service Bus Emulator (Docker) -> academic-messages-queue -> Receptor (Ivan)
```

Incluye el cambio de arquitectura (Azure real -> emulador local) explicado en
`docs/francisco-azure-integracion.md`, seccion 2.

## 3. Contrato compartido del mensaje

Referencia directa a `shared/message-contract.md` (fijo, sin modificaciones).
No se repite el contenido completo; se cita la fuente unica de verdad.

## 4. Funcionamiento del emisor

Aporta Kenneth (`docs/kenneth-emisor.md` o equivalente en su rama). Debe
cubrir:

- Conexion del emisor con Azure Service Bus (via el emulador local).
- Generacion de los cinco mensajes, cada uno con UUID v4 independiente.
- Envio consecutivo y confirmacion de cada envio.
- Manejo de errores (envio parcial, no reintento automatico del lote).
- Cierre ordenado de la conexion (`sender.close()`, `client.close()`).

## 5. Funcionamiento del Service Bus Emulator

Aporta Francisco (`docs/francisco-azure-integracion.md`, secciones 3 a 6).
Cubre que es Azure Service Bus, que es el emulador, configuracion de Docker,
`Config.json` y la cola `academic-messages-queue`.

## 6. Funcionamiento de la cola

Aporta Francisco. La cola se declara en `Config.json` y se verifica en
tiempo de ejecucion con `scripts/contar-mensajes.js`
(ver `docs/francisco-azure-integracion.md`, seccion 6).

## 7. Funcionamiento del receptor

Aporta Ivan (`docs/ivan-receptor.md` o equivalente en su rama). Debe cubrir:

- Conexion del receptor (modo `peekLock`).
- Lectura por lotes de la cola hasta agotar mensajes nuevos.
- Validacion de cada mensaje contra el contrato compartido.
- Contador de mensajes procesados y de errores.
- Confirmacion individual (`completeMessage`) y manejo de mensajes invalidos
  (`abandonMessage`).
- Cierre ordenado de la conexion.

## 8. Integracion completa

Aporta Francisco (`docs/francisco-azure-integracion.md`, seccion 7). Muestra
como emisor, cola local y receptor se conectan usando el mismo SDK
`@azure/service-bus` y la misma cadena de conexion local del emulador.

## 9. Prueba de cinco mensajes

Aporta Francisco, con apoyo de Kenneth e Ivan para confirmar sus respectivos
pasos (`docs/francisco-azure-integracion.md`, seccion 8). Debe reflejar
exactamente la secuencia:

```text
COLA = 0 -> EMISOR DETENIDO -> EJECUTAR EMISOR -> 5 MENSAJES EN COLA
   -> INICIAR RECEPTOR -> CONSUMIR MENSAJE 1..5 -> COLA = 0
```

## 10. Evidencias

Aporta Francisco (`docs/evidencias.md`), con evidencias de Kenneth e Ivan
generadas durante su propia ejecucion si aplica (por ejemplo, capturas de su
propia consola). No se incluyen capturas de Azure Portal porque no se
utilizo Azure Portal en esta implementacion.

## 11. Manejo de errores

Seccion conjunta: envio parcial (Kenneth), mensajes invalidos o error al
completar (Ivan), y problemas de infraestructura o conexion al emulador
(Francisco).

## 12. Seguridad

Aporta Francisco (`docs/francisco-azure-integracion.md`, seccion 10), con
referencia a las reglas de `.gitignore` y a que ni Kenneth ni Ivan deben
subir sus archivos `.env` locales.

## 13. Limitaciones

Aporta Francisco (`docs/francisco-azure-integracion.md`, seccion 11):
ejecucion local, uso de Docker, uso del emulador, ausencia de recursos reales
de Azure Cloud, y aspectos que el emulador no permite demostrar (politicas
SAS separadas, persistencia, escalado, Microsoft Entra ID).

## 14. Conclusiones

Seccion conjunta. Cada integrante resume que logro comprobar en su parte;
Francisco resume ademas que quedaria pendiente de validar al migrar a Azure
Service Bus real (`docs/francisco-azure-integracion.md`, seccion 12).

## 15. Referencias (APA 7)

Se consolidan en una sola lista al final del documento, sin duplicar
referencias entre las tres secciones. La lista de fuentes de Francisco esta
en `docs/francisco-azure-integracion.md`, seccion 13; Kenneth e Ivan deben
agregar ahi mismo las suyas si citan documentacion adicional del SDK
`@azure/service-bus`.

## Regla de atribucion

Ninguna seccion debe atribuir a Francisco funcionalidades implementadas por
Kenneth (emisor) o Ivan (receptor), ni viceversa. Cada seccion identifica
explicitamente a su autor.
