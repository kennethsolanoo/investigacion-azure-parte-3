# Guía del código de Kenneth

## 1. Qué problema resuelve el emisor

El emisor prepara un lote fijo de cinco mensajes y, cuando Azure esté configurado, los envía a una cola de Azure Service Bus. Su función es demostrar la primera parte del flujo del proyecto: Kenneth genera los mensajes para que después Iván pueda recibirlos con la aplicación receptora.

## 2. Archivos que corresponden a mi parte

- `sender/public/index.html`
- `sender/public/styles.css`
- `sender/public/app.js`
- `sender/src/generador-mensajes.js`
- `sender/src/enviar-azure.js`
- `sender/src/enviar-mensajes.js`
- `sender/src/servidor.js`
- `sender/src/validar-mensajes-local.js`
- `sender/README.md`
- `sender/GUIA_CODIGO_KENNETH.md`
- `docs/kenneth-emisor.md`

## 3. Responsabilidad de cada archivo

`index.html` define la estructura visual tipo aplicación de mensajería.

`styles.css` contiene el diseño: contenedor tipo teléfono, encabezado, burbujas, estados y responsive.

`app.js` controla los botones, llama a la API local y muestra los mensajes como burbujas.

`generador-mensajes.js` crea los cinco mensajes respetando el contrato del proyecto.

`enviar-azure.js` abre la conexión con Azure Service Bus y envía exactamente cinco mensajes.

`enviar-mensajes.js` conserva la versión de consola.

`servidor.js` levanta Express, sirve la interfaz y expone los endpoints.

`validar-mensajes-local.js` prueba localmente que se generen cinco mensajes correctos con UUID diferentes.

## 4. Flujo al presionar `Preparar 5 mensajes`

```text
Interfaz web
    ↓ petición HTTP
Servidor Express
    ↓ genera y valida
Módulo de mensajes
    ↓ respuesta local
Burbujas en la pantalla
```

Este flujo no usa Azure. Solo genera una vista previa local para revisar asunto, descripción, hora, UUID y detalles técnicos.

## 5. Flujo al presionar `Enviar lote a Azure`

```text
Interfaz web
    ↓ petición HTTP
Servidor Express
    ↓ genera y valida
Módulo de mensajes
    ↓ envío real
Azure Service Bus
    ↓ consumo
Receptor de Iván
```

El botón solo se habilita cuando el backend detecta las variables necesarias. Si falta la conexión SAS `Send`, el envío queda deshabilitado.

## 6. Cómo se generan los UUID

Cada mensaje usa `crypto.randomUUID()` de Node.js. Esto genera un identificador único para relacionar el mensaje preparado, el mensaje enviado a Azure y el mensaje que después debería recibir Iván.

## 7. Qué es el contrato del mensaje

El contrato es la estructura obligatoria del JSON:

```json
{
  "messageId": "uuid-v4",
  "sentAt": "fecha ISO 8601",
  "sender": "AplicacionEmisora",
  "subject": "Mensaje 1 de 5",
  "description": "Mensaje consecutivo enviado para demostrar Azure Service Bus.",
  "createdBy": "Kenneth"
}
```

El emisor no agrega campos nuevos a ese cuerpo.

## 8. Diferencia entre `body.messageId` y `azure.messageId`

`body.messageId` es el campo dentro del JSON.

`azure.messageId` es la propiedad del mensaje que Azure Service Bus recibe.

En este proyecto ambos usan el mismo UUID para comprobar que el mensaje preparado por Kenneth es el mismo que Azure almacena y que luego Iván puede recibir.

## 9. Para qué sirve Express

Express permite levantar un servidor local en `http://localhost:3000`. Ese servidor entrega la interfaz web y recibe las peticiones de los botones sin exponer la conexión SAS al navegador.

## 10. Para qué sirve Azure Service Bus

Azure Service Bus funciona como intermediario. Kenneth no envía mensajes directamente a Iván; los coloca en una cola para que la aplicación receptora los consuma posteriormente.

## 11. Por qué la conexión está únicamente en el backend

La cadena SAS permite enviar mensajes. Si se enviara al navegador, podría quedar visible en herramientas de desarrollo o capturas. Por eso solo `servidor.js` y `enviar-azure.js` la usan desde `sender/.env`.

## 12. Cómo se cierra la conexión correctamente

`enviar-azure.js` crea `ServiceBusClient` y `sender` solo durante el envío. Ambos se cierran dentro de `finally`, para liberar recursos aunque Azure devuelva un error.

## 13. Qué se puede probar sin Azure

Sin Azure se puede probar:

- Que la interfaz carga.
- Que el estado dice `Modo local`.
- Que `Preparar 5 mensajes` genera cinco burbujas.
- Que cada UUID es diferente.
- Que los detalles técnicos abren y cierran.
- Que `Enviar lote a Azure` permanece deshabilitado.
- Que las pruebas locales pasan.

## 14. Qué depende de Francisco

Francisco debe crear Azure Service Bus, la cola y la política SAS con permiso `Send`. Sin esa conexión real, Kenneth no puede demostrar envío real a la cola.

## 15. Qué depende del receptor de Iván

Iván debe implementar la aplicación receptora que escucha la cola y procesa los mensajes. Kenneth solo deja los mensajes preparados o enviados a la cola.

## 16. Preguntas posibles de exposición

**¿Por qué son cinco mensajes?**
Porque la demostración del emisor fue diseñada para mostrar un lote fijo y fácil de comprobar.

**¿La vista previa envía algo a Azure?**
No. La vista previa solo genera mensajes localmente.

**¿Dónde está la contraseña o conexión?**
No está en el código. Debe estar localmente en `sender/.env`, ignorado por Git.

**¿Por qué no se reintenta automáticamente si falla Azure?**
Porque si algunos mensajes ya fueron aceptados, repetir todo el lote podría duplicarlos.

**¿Cómo se comprueba que cada mensaje es único?**
Con los UUID generados por `crypto.randomUUID()` y con la prueba local `npm.cmd run test:local`.

**¿Qué demuestra la interfaz tipo mensajería?**
Representa visualmente que Kenneth prepara mensajes para un receptor, pero el envío real pasa por Azure Service Bus.

**¿Qué parte no hizo Kenneth?**
Kenneth no configuró Azure ni implementó el receptor. Eso corresponde a Francisco e Iván.
