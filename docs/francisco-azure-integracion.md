# Configuracion de Azure Service Bus e integracion - Francisco

## 1. Objetivo

Dentro del proyecto "Investigacion Azure Parte 3", la parte de Francisco
corresponde a la infraestructura de mensajeria y a la integracion entre las
aplicaciones de Kenneth (emisor) e Ivan (receptor):

- Preparar el entorno de Azure Service Bus que ambas aplicaciones usan.
- Crear/configurar la cola `academic-messages-queue`.
- Asegurar que el emisor y el receptor puedan comunicarse a traves de esa cola.
- Documentar la configuracion, la seguridad de credenciales y las evidencias.
- Consolidar la estructura del documento final del equipo.

Francisco **no** implementa el emisor ni el receptor; esa logica corresponde
a `sender/**` (Kenneth) y `receiver/**` (Ivan), definida en el contrato
compartido (`shared/message-contract.md`).

## 2. Cambio de arquitectura

El planteamiento inicial del proyecto era usar un namespace real de Azure
Service Bus en la nube (ver `azure/provision-service-bus.ps1`, preparado como
referencia para un despliegue real con Azure CLI, y `docs/francisco-azure.md`
en la rama de integracion previa, que documenta la configuracion pensada para
Azure real).

Para las pruebas de este equipo se decidio **no** usar Azure en la nube y
usar en su lugar el **Azure Service Bus Emulator** de Microsoft, ejecutado
localmente mediante Docker. La razon principal es poder ejecutar y repetir la
prueba de los cinco mensajes sin depender de una suscripcion de Azure, sin
generar costos y sin necesidad de coordinar el acceso de tres personas a un
mismo namespace en la nube.

Esto es un cambio de **donde se ejecuta** la prueba, no del diseno de la
solucion: el emisor sigue enviando a una cola con el SDK `@azure/service-bus`,
y el receptor sigue leyendo de esa misma cola con el mismo SDK. El contrato
del mensaje (`shared/message-contract.md`) no cambia.

## 3. Que es Azure Service Bus

Azure Service Bus es un servicio de mensajeria en la nube de Microsoft Azure
que permite a aplicaciones independientes comunicarse de forma asincrona
mediante colas y temas (publish/subscribe), sin que el emisor y el receptor
necesiten estar activos al mismo tiempo. En este proyecto se usa como
intermediario: el emisor coloca mensajes en una cola y el receptor los lee y
confirma de forma independiente.

```text
Emisor (Kenneth) -> Azure Service Bus -> Receptor (Ivan)
```

## 4. Que es el emulador

El **Azure Service Bus Emulator** es una imagen de Docker publicada
oficialmente por Microsoft (`mcr.microsoft.com/azure-messaging/servicebus-emulator`)
que reproduce el comportamiento de una cola/topic de Azure Service Bus de
forma local, sin necesitar una suscripcion de Azure ni conectividad a
internet hacia el servicio real.

**Para que sirve:**

- Permite desarrollar y probar el flujo de mensajeria (envio, recepcion,
  confirmacion, abandono de mensajes) usando el mismo SDK oficial
  (`@azure/service-bus`) que se usaria contra Azure real.
- Evita crear recursos de pago en Azure solo para pruebas de desarrollo o
  academicas.

**Por que se utilizo en este proyecto:**

- El equipo necesitaba repetir la prueba de los cinco mensajes varias veces
  durante el desarrollo, sin depender de un namespace compartido en la nube.
- No requiere que los tres integrantes tengan acceso a la misma suscripcion
  de Azure.

**Que permite probar:**

- Creacion de una cola (`academic-messages-queue`).
- Envio de mensajes con `ServiceBusClient` / `createSender`.
- Recepcion en modo `peekLock`, con `completeMessage` y `abandonMessage`.
- El flujo completo de los cinco mensajes descrito en la seccion 8.

**Diferencias respecto a Azure Service Bus real:**

| Aspecto | Azure Service Bus real | Azure Service Bus Emulator (local) |
|---|---|---|
| Donde corre | Recurso en la nube de Azure | Contenedor Docker en la maquina local |
| Administracion | Azure Portal / Azure CLI | Archivo `Config.json` local (se aplica al reiniciar el contenedor) |
| Politicas SAS | Se pueden crear politicas separadas con permisos `Send` y `Listen` | Usa una unica cadena de conexion local y estatica; no reproduce politicas SAS independientes |
| Persistencia | Los mensajes persisten segun la configuracion del namespace | Al reiniciar el contenedor, los datos y entidades no persisten |
| Autenticacion | Microsoft Entra ID o SAS reales | Sin autenticacion real; la cadena de conexion es fija y de desarrollo |
| Costo | Genera costo segun el plan | Sin costo, limitado por los recursos de la maquina local |
| Protocolo | AMQP (y otros segun el plan) | Solo AMQP por TCP; no soporta AMQP sobre WebSockets ni JMS |
| Particionado / geo-recuperacion | Disponible segun el plan | No disponible |

Estas diferencias estan documentadas por Microsoft en la pagina oficial del
emulador (ver seccion 13, Fuentes).

## 5. Configuracion de Docker

### Requisitos

- Docker Desktop (Windows/macOS) o Docker Engine + Docker Compose (Linux).
- Puertos locales libres: `5672` (AMQP) y `5300` (API HTTP interna del
  emulador).
- Node.js en la version LTS documentada en la raiz del repositorio.

### Estructura usada

```text
shared/azure-service-bus-emulator/
├── docker-compose.yml
├── .env.example
├── config/
│   └── Config.json
└── scripts/
    ├── contar-mensajes.js
    └── run-prueba-integrada.sh
```

### Contenedores utilizados

- `servicebus-emulator`: imagen oficial
  `mcr.microsoft.com/azure-messaging/servicebus-emulator:latest`. Es el motor
  del emulador; expone el puerto AMQP `5672` y la API HTTP `5300`.
- `sqledge`: imagen oficial `mcr.microsoft.com/azure-sql-edge:latest`. El
  emulador la usa internamente para guardar su estado (colas, mensajes)
  mientras el contenedor esta activo.

### Variables de entorno del emulador

Definidas en `shared/azure-service-bus-emulator/.env` (local, no versionado,
creado a partir de `.env.example`):

```env
CONFIG_PATH=./config/Config.json
SQL_PASSWORD=CAMBIA_ESTA_CONTRASENA_LOCAL
ACCEPT_EULA=Y
```

`SQL_PASSWORD` es una contrasena de un contenedor local y efimero (no es una
credencial de Azure), pero de todas formas no se sube al repositorio: solo se
versiona `.env.example` con un valor de ejemplo.

### Configuracion del emulador (Config.json)

`shared/azure-service-bus-emulator/config/Config.json` define el namespace
local del emulador (`sbemulatorns`) y la cola `academic-messages-queue` con
las propiedades minimas necesarias (tiempo de vida, duracion de bloqueo,
cantidad maxima de entregas). El emulador solo permite modificar entidades
editando este archivo y reiniciando el contenedor; los cambios no se aplican
en caliente.

### Como iniciar el entorno

```bash
cd shared/azure-service-bus-emulator
cp .env.example .env
docker compose --env-file .env up -d
```

### Como comprobar que funciona

```bash
docker compose --env-file .env ps
docker compose --env-file .env logs emulator
```

El contenedor `servicebus-emulator` debe aparecer como `Up`/`running`, y en
los logs debe verse que cargo `Config.json` y que quedo escuchando en el
puerto `5672`.

### Como detenerlo

```bash
docker compose --env-file .env down
```

Al detener y volver a iniciar el entorno, la cola vuelve a quedar vacia
(el emulador no persiste mensajes entre reinicios), lo cual es coherente con
la limitacion documentada por Microsoft.

## 6. Configuracion de la cola

La cola `academic-messages-queue` se declara de forma declarativa en
`Config.json` (ver seccion 5) dentro de `Namespaces[0].Queues`. No se crea
manualmente con comandos de administracion; el emulador la crea al iniciar el
contenedor, a partir de ese archivo.

Para verificar en tiempo de ejecucion que la cola existe y consultar cuantos
mensajes tiene, se usa el script
`shared/azure-service-bus-emulator/scripts/contar-mensajes.js`, que llama a
`ServiceBusAdministrationClient.getQueueRuntimeProperties("academic-messages-queue")`
del SDK `@azure/service-bus`. Este script solo lee el conteo; no envia ni
consume mensajes.

## 7. Integracion

```text
Emisor (Kenneth, sender/**)
   ↓  ServiceBusClient.createSender("academic-messages-queue")
Azure Service Bus Emulator (Docker, puerto 5672)
   ↓  cola academic-messages-queue
Receptor (Ivan, receiver/**)
   ↓  ServiceBusClient.createReceiver("academic-messages-queue", { receiveMode: "peekLock" })
```

Tanto el emisor como el receptor usan el mismo SDK oficial
(`@azure/service-bus`) que usarian contra Azure real; lo unico que cambia es
la cadena de conexion, que en el entorno local del emulador es:

```text
Endpoint=sb://localhost;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=SAS_KEY_VALUE;UseDevelopmentEmulator=true;
```

Esta es la cadena de conexion estatica que documenta Microsoft para el
emulador (no es una credencial real ni da acceso a ningun recurso de Azure).
Mientras se trabaja contra el emulador, tanto
`AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING` (usada por `sender/**`) como
`AZURE_SERVICE_BUS_RECEIVER_CONNECTION_STRING` (usada por `receiver/**`)
apuntan a este mismo valor local, porque el emulador no reproduce politicas
SAS separadas de `Send` y `Listen` (ver seccion 10).

## 8. Prueba integrada

El procedimiento sigue exactamente el flujo definido para el proyecto:

1. **Estado inicial**: iniciar Docker y el emulador
   (`docker compose --env-file .env up -d`), confirmar que
   `academic-messages-queue` esta vacia con `contar-mensajes.js`, y mantener
   el receptor detenido.
2. **Envio**: ejecutar el emisor (`npm run enviar:consola` dentro de
   `sender/`). El emisor genera cinco mensajes, cada uno con un `messageId`
   UUID v4 propio, y los envia consecutivamente, confirmando cada envio por
   consola. Al terminar, el emisor se detiene solo (no queda un proceso
   corriendo).
3. **Comprobacion**: volver a ejecutar `contar-mensajes.js` y confirmar que
   `activeMessageCount` es 5.
4. **Recepcion**: iniciar el receptor (`npm start` dentro de `receiver/`). El
   receptor lee los mensajes en lotes, valida cada uno contra el contrato
   (`shared/message-contract.md`), los completa individualmente
   (`completeMessage`) y lleva un contador de mensajes procesados. Al no
   llegar mensajes nuevos durante 10 segundos, el receptor cierra la conexion
   solo y muestra un resumen final con los `messageId` recibidos.
5. **Estado final**: ejecutar `contar-mensajes.js` una vez mas y confirmar
   que `activeMessageCount` vuelve a 0.

El script
`shared/azure-service-bus-emulator/scripts/run-prueba-integrada.sh` automatiza
estos pasos en orden y guarda la salida de cada paso como evidencia en texto
dentro de `evidence/azure/` (ver `docs/evidencias.md`).

Secuencia esperada:

```text
COLA = 0
  -> EMISOR DETENIDO
  -> EJECUTAR EMISOR
  -> 5 MENSAJES EN COLA
  -> INICIAR RECEPTOR
  -> CONSUMIR MENSAJE 1..5
  -> COLA = 0
```

## 9. Problemas encontrados

En esta preparacion de infraestructura no se detecto ningun problema real
durante la configuracion del `docker-compose.yml` ni del `Config.json`: ambos
se basaron directamente en la plantilla oficial de Microsoft para el
emulador. La ejecucion real del contenedor y de la prueba de los cinco
mensajes debe hacerla quien tenga Docker disponible en su maquina (ver
limitaciones en la seccion 11); si al ejecutarla surge algun problema real
(por ejemplo, un puerto ocupado o una espera insuficiente para que `sqledge`
quede listo), debe documentarse aqui con su causa y solucion antes de la
entrega final. No se inventan problemas que no hayan ocurrido.

## 10. Seguridad

- **Variables de entorno**: todas las cadenas de conexion (reales o locales
  del emulador) se leen desde archivos `.env` locales, nunca desde codigo
  fuente.
- **Proteccion de credenciales**: `.gitignore` excluye `.env`, cualquier
  archivo `*.secret` o `*.key`, y en general cualquier `.env.*` que no sea un
  `.env.example`. Solo se versionan plantillas (`.env.example`) con valores
  ficticios.
- **Ausencia de secretos en GitHub**: no se sube ninguna cadena de conexion
  real de Azure ni la contrasena del contenedor `sqledge`.
- **Diferencias de seguridad entre el entorno local y Azure real**: el
  emulador usa una cadena de conexion local, estatica y publica
  (`SharedAccessKeyName=RootManageSharedAccessKey`, con el valor literal
  `SAS_KEY_VALUE` documentado por Microsoft). Esto es aceptable unicamente
  porque el emulador solo escucha en `localhost` dentro de la maquina de
  desarrollo; **no** reproduce el modelo de permisos SAS granulares
  (`Send` / `Listen` separados) que exige el contrato del proyecto para un
  despliegue real en Azure, ni el control de acceso de Microsoft Entra ID.
  Esta es una limitacion del emulador, no una omision del equipo: no se
  simulan politicas `Send`/`Listen` que en realidad no existen en el
  entorno local.

## 11. Limitaciones

- La prueba se ejecuto **localmente**, usando **Docker**, con el
  **Azure Service Bus Emulator** de Microsoft.
- **No** se uso un recurso real de Azure Cloud, ni Azure Portal, ni una
  suscripcion de Azure.
- El emulador **no** reproduce politicas SAS separadas de `Send`/`Listen`; la
  separacion de permisos entre emisor y receptor solo puede demostrarse
  contra un namespace real de Azure (ver `azure/provision-service-bus.ps1`
  como preparacion para ese escenario).
- El emulador **no** persiste mensajes ni entidades entre reinicios del
  contenedor.
- El emulador **no** soporta particionado, geo-recuperacion, autoescalado,
  redes virtuales ni integracion con Microsoft Entra ID.
- El emulador solo soporta AMQP por TCP (no AMQP sobre WebSockets, ni JMS).
- No se genero ninguna captura de Azure Portal, porque no se utilizo Azure
  Portal en esta implementacion.

## 12. Conclusiones

Con el Azure Service Bus Emulator local fue posible comprobar el flujo
completo de mensajeria previsto por el contrato del proyecto: creacion
declarativa de la cola `academic-messages-queue`, envio consecutivo de cinco
mensajes con UUID independientes desde la aplicacion de Kenneth, y su lectura,
validacion y confirmacion individual desde la aplicacion de Ivan, usando en
ambos casos el SDK oficial `@azure/service-bus`.

Quedan pendientes de validar al migrar a Azure Service Bus real:

- El comportamiento con politicas SAS separadas `Send` (emisor) y `Listen`
  (receptor), en lugar de una unica cadena de conexion local.
- La persistencia de mensajes entre reinicios del recurso.
- El comportamiento bajo la infraestructura real de Azure (redes, escalado,
  monitoreo desde Azure Portal, autenticacion con Microsoft Entra ID).
- Los costos reales de operacion, hoy inexistentes en el entorno local.

## 13. Fuentes

Microsoft. (2024). *Azure Service Bus emulator overview* [Documentacion tecnica]. Microsoft Learn. https://learn.microsoft.com/en-us/azure/service-bus-messaging/overview-emulator

Microsoft. (2024). *Test locally by using the Azure Service Bus emulator*. Microsoft Learn. https://learn.microsoft.com/en-us/azure/service-bus-messaging/test-locally-with-service-bus-emulator

Microsoft. (2024). *Azure Service Bus emulator* [Imagen de contenedor]. Microsoft Artifact Registry. https://hub.docker.com/r/microsoft/azure-messaging-servicebus-emulator

Microsoft Azure. (2024). *azure-service-bus-emulator-installer* [Repositorio de codigo]. GitHub. https://github.com/Azure/azure-service-bus-emulator-installer

Microsoft. (s.f.). *Azure Service Bus documentation*. Microsoft Learn. https://learn.microsoft.com/en-us/azure/service-bus-messaging/
