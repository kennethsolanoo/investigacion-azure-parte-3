#!/usr/bin/env bash
# Orquesta la prueba integrada obligatoria (5 mensajes) contra el Azure Service
# Bus Emulator local y guarda evidencia en texto (logs de consola) dentro de
# evidence/azure/. No usa Azure real ni Azure Portal.
#
# Requisitos previos (locales, no versionados):
#   - Docker y Docker Compose instalados y corriendo.
#   - shared/azure-service-bus-emulator/.env creado a partir de .env.example.
#   - sender/.env creado con AZURE_SERVICE_BUS_SENDER_CONNECTION_STRING apuntando
#     a la cadena estatica del emulador y AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue.
#   - receiver/.env creado con AZURE_SERVICE_BUS_RECEIVER_CONNECTION_STRING (misma
#     cadena del emulador) y AZURE_SERVICE_BUS_QUEUE_NAME=academic-messages-queue.
#   - npm install ejecutado en sender/, receiver/ y shared/azure-service-bus-emulator/scripts/.
#
# Uso: ejecutar desde la raiz del repositorio
#   bash shared/azure-service-bus-emulator/scripts/run-prueba-integrada.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
EMULATOR_DIR="$ROOT_DIR/shared/azure-service-bus-emulator"
EVIDENCE_DIR="$ROOT_DIR/evidence/azure"

mkdir -p "$EVIDENCE_DIR"

echo "== 1. Iniciando el Azure Service Bus Emulator (Docker) =="
docker compose -f "$EMULATOR_DIR/docker-compose.yml" --env-file "$EMULATOR_DIR/.env" up -d

echo "== 2. Esperando a que el emulador y SQL Edge esten listos (30s) =="
sleep 30

docker compose -f "$EMULATOR_DIR/docker-compose.yml" --env-file "$EMULATOR_DIR/.env" ps \
  | tee "$EVIDENCE_DIR/00-contenedores-activos.txt"

echo "== 3. Estado inicial de la cola (debe ser 0) =="
node "$EMULATOR_DIR/scripts/contar-mensajes.js" | tee "$EVIDENCE_DIR/01-cola-vacia-inicial.txt"

echo "== 4. Ejecutando el emisor (5 mensajes) - receptor permanece detenido =="
( cd "$ROOT_DIR/sender" && npm run enviar:consola ) | tee "$EVIDENCE_DIR/02-envio-cinco-mensajes.txt"

echo "== 5. Verificando 5 mensajes activos en la cola =="
node "$EMULATOR_DIR/scripts/contar-mensajes.js" | tee "$EVIDENCE_DIR/03-cola-cinco-mensajes.txt"

echo "== 6. Ejecutando el receptor (consume y confirma los 5 mensajes) =="
( cd "$ROOT_DIR/receiver" && npm start ) | tee "$EVIDENCE_DIR/04-recepcion-cinco-mensajes.txt"

echo "== 7. Verificando que la cola vuelve a quedar en 0 =="
node "$EMULATOR_DIR/scripts/contar-mensajes.js" | tee "$EVIDENCE_DIR/05-cola-vacia-final.txt"

echo "== 8. Guardando logs del contenedor del emulador =="
docker compose -f "$EMULATOR_DIR/docker-compose.yml" --env-file "$EMULATOR_DIR/.env" logs emulator \
  | tee "$EVIDENCE_DIR/06-logs-emulador.txt" > /dev/null

echo "== 9. Deteniendo el entorno =="
docker compose -f "$EMULATOR_DIR/docker-compose.yml" --env-file "$EMULATOR_DIR/.env" down \
  | tee "$EVIDENCE_DIR/07-detencion-entorno.txt"

echo "Prueba integrada finalizada. Revise evidence/azure/ para los resultados."
