# Azure Service Bus Emulator (local, con Docker)

Esta carpeta contiene la configuracion de infraestructura a cargo de Francisco:
el **Azure Service Bus Emulator** de Microsoft, ejecutado localmente mediante
Docker, con la cola `academic-messages-queue` ya configurada.

No se usa Azure en la nube. No hay namespace real, ni Azure Portal, ni claves
SAS reales. El detalle completo esta en
[`docs/francisco-azure-integracion.md`](../../docs/francisco-azure-integracion.md).

## Contenido

```text
shared/azure-service-bus-emulator/
├── docker-compose.yml   # Contenedores: emulator + sqledge
├── .env.example         # Plantilla de variables locales (sin credenciales reales)
├── config/
│   └── Config.json      # Define la cola academic-messages-queue
└── scripts/
    ├── package.json
    ├── contar-mensajes.js        # Consulta cuantos mensajes hay en la cola
    └── run-prueba-integrada.sh   # Orquesta la prueba de los 5 mensajes
```

## Requisitos

- Docker Desktop (o Docker Engine + Docker Compose) instalado y en ejecucion.
- Node.js (misma version LTS documentada en la raiz del proyecto).
- Puertos `5672` y `5300` libres en la maquina local.

## Uso rapido

```bash
cd shared/azure-service-bus-emulator
cp .env.example .env
# Editar .env si se desea cambiar la contrasena local de sqledge

docker compose --env-file .env up -d
```

Cadena de conexion local del emulador (estatica, documentada por Microsoft,
no es una credencial real de Azure):

```text
Endpoint=sb://localhost;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=SAS_KEY_VALUE;UseDevelopmentEmulator=true;
```

Para detener el entorno:

```bash
docker compose --env-file .env down
```

## Prueba integrada automatizada

Desde la raiz del repositorio, con `sender/.env` y `receiver/.env` ya
configurados apuntando al emulador:

```bash
bash shared/azure-service-bus-emulator/scripts/run-prueba-integrada.sh
```

El script deja la evidencia en texto (conteo de mensajes antes/despues, salida
del emisor, salida del receptor y logs del contenedor) dentro de
`evidence/azure/`.
