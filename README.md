# La Última Edición

Escape room híbrido y colaborativo sobre verificación de información. Está hecho con HTML, CSS, JavaScript, Node.js, Express y Socket.IO.

## Ejecutarlo en tu computador

1. Instala Node.js 20 o una versión posterior.
2. En esta carpeta, ejecuta `npm install`.
3. Ejecuta `npm start`.
4. Abre `http://localhost:3000`.

El anfitrión crea una sala y comparte el código de cuatro caracteres. La partida se sincroniza en tiempo real para los dispositivos conectados. Cada sala admite hasta 80 jugadores.

## Publicarlo en Render

1. Sube esta carpeta a un repositorio de GitHub.
2. En Render, selecciona **New +** y luego **Blueprint**; elige el repositorio.
3. Render detectará `render.yaml`. Confirma el servicio y pulsa **Apply**.
4. Cuando termine, abre la URL pública de Render y compártela con la clase.

También puedes crear un **Web Service** manualmente con estos valores:

- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `Node`

Las salas se mantienen en memoria. Si Render reinicia el servicio, las partidas activas se reinician; es normal en el plan gratuito. Para una persistencia permanente habría que conectar una base de datos, pero no hace falta para sesiones de clase.

## Versión híbrida: QR y espacios físicos

Después de publicar el proyecto en Render, abre `https://TU-URL-DE-RENDER/qr-print.html` e imprime las once tarjetas. Colócalas en Biblioteca, Aula de informática, Salón de clase, Auditorio, Salón de sociales, Rectoría, Patio central, Cancha, Laboratorio, Enfermería y Portería/salida.

Cada punto físico bloquea una estación virtual. Al escanear el QR, el jugador escribe el código de la sala y la evidencia se desbloquea en tiempo real para todo el equipo. Puedes cambiar los nombres, pistas y claves de los lugares en el objeto `checkpoints` de `server.js`.

## Soluciones para la prueba del docente

1. `CONFIRMAN`
2. `2417`
3. `FUENTE`
4. Titular → Hecho → Fuente → Contexto → Explicación
5. `MEDIO B`
6. Hecho → Manipulación → Interpretación
7. Opción B
