const express = require('express');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const makeCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();
const cleanName = (name) => String(name || 'Periodista').trim().slice(0, 22) || 'Periodista';
const checkpoints = {
  photo: { key: 'BIB-2417', location: 'Biblioteca', clue: 'Coloca el QR junto al libro, mapa o ficha fotográfica preparada.' },
  social: { key: 'INFO-FUENTE', location: 'Aula de informática', clue: 'Coloca el QR junto al computador o cartel de fuentes.' },
  archive: { key: 'AULA-SECUENCIA', location: 'Salón de clase', clue: 'Coloca el QR junto a las cuatro tarjetas de la línea temporal.' },
  relay: { key: 'PATIO-NORA', location: 'Patio central', clue: 'Coloca el QR junto a un cartel de transmisiones de Nora.' },
  route: { key: 'CANCHA-RUTA', location: 'Cancha', clue: 'Coloca el QR en el punto de salida señalado.' }
};


function publicState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: [...room.players.values()].map(({ id, name }) => ({ id, name })),
    started: room.started,
    startedAt: room.startedAt,
    solved: room.solved,
    evidence: room.evidence,
    classifications: room.classifications,
    finalWon: room.finalWon,
    lives: room.lives,
    failed: room.failed,
    physical: room.physical
  };
}

function broadcast(room) { io.to(room.code).emit('room:update', publicState(room)); }

io.on('connection', (socket) => {
  socket.on('room:create', ({ name, playerToken }, done) => {
    let code; do { code = makeCode(); } while (rooms.has(code));
    const room = { code, hostId: socket.id, players: new Map(), started: false, startedAt: null,
      solved: [], evidence: [], classifications: {}, finalWon: false, lives: 3, failed: false, physical: {} };
    room.players.set(socket.id, { id: socket.id, name: cleanName(name), token: String(playerToken || socket.id) });
    rooms.set(code, room); socket.join(code); done({ ok: true, state: publicState(room) });
  });

  socket.on('room:join', ({ code, name, playerToken }, done) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room) return done({ ok: false, error: 'No encontramos esa sala. Revisa el código.' });
    if (room.players.size >= 80) return done({ ok: false, error: 'La sala ya alcanzó su capacidad.' });
    room.players.set(socket.id, { id: socket.id, name: cleanName(name), token: String(playerToken || socket.id) });
    socket.join(room.code); broadcast(room); done({ ok: true, state: publicState(room) });
  });

  socket.on('game:start', ({ code }, done) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    room.started = true; room.startedAt = Date.now(); broadcast(room); done?.({ ok: true });
  });

  socket.on('physical:unlock', ({ code, station, key, playerToken, playerName }, done) => {
    const room = rooms.get(String(code || '').toUpperCase());
    const point = checkpoints[station];
    if (!room || !room.started || !point || key !== point.key) return done?.({ ok: false, error: 'Este QR o código de partida no es válido o la misión no ha comenzado.' });
    const player = [...room.players.values()].find((item) => item.token === String(playerToken)) || [...room.players.values()].find((item) => item.name.toLowerCase().startsWith(`${String(playerName || '').trim().toLowerCase()} ·`));
    if (!player) return done?.({ ok: false, error: 'No encontramos ese jugador en la sala. Escribe el mismo nombre usado al entrar al juego.' });
    room.physical[player.token] ??= {};
    room.physical[player.token][station] = true;
    broadcast(room);
    done?.({ ok: true, location: point.location });
  });

  socket.on('game:solve', ({ code, puzzle, answer }, done) => {
    const room = rooms.get(code);
    if (!room || !room.started || room.finalWon) return;
    const expected = { photo: '2417', social: 'FUENTE', archive: '3,4,1,2', relay: 'NORA', route: 'RUTA C' };
    const value = String(answer || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (expected[puzzle] !== value) { room.lives = Math.max(0, room.lives - 1); if (!room.lives) room.failed = true; broadcast(room); return done?.({ ok: false, message: room.failed ? 'La señal de los periodistas se apagó. La misión terminó.' : `Respuesta incorrecta. Quedan ${room.lives} vidas.` }); }
    if (!room.solved.includes(puzzle)) {
      room.solved.push(puzzle);
      const labels = { photo: 'Imagen verificada', social: 'Fuente rastreable', archive: 'Cronología', relay: 'Señal de Nora', route: 'Ruta de salida' };
      room.evidence.push(labels[puzzle]); broadcast(room);
    }
    done?.({ ok: true, message: 'Archivo recuperado.' });
  });

  socket.on('game:classify', ({ code, values }, done) => {
    const room = rooms.get(code);
    const correct = ['hecho', 'manipulacion', 'interpretacion'];
    if (!room || !Array.isArray(values) || values.join(',') !== correct.join(',')) { if (!room) return; room.lives = Math.max(0, room.lives - 1); if (!room.lives) room.failed = true; broadcast(room); return done?.({ ok: false, message: room.failed ? 'La señal de los periodistas se apagó. La misión terminó.' : `Clasificación incorrecta. Quedan ${room.lives} vidas.` }); }
    room.classifications = { done: true }; if (!room.evidence.includes('VERIFICA')) room.evidence.push('VERIFICA'); broadcast(room);
    done?.({ ok: true, message: 'La clave VERIFICA fue añadida al expediente.' });
  });

  socket.on('game:final', ({ code, choice }, done) => {
    const room = rooms.get(code);
    if (!room || room.solved.length < 5) return done?.({ ok: false, message: 'Todavía faltan puertas por abrir.' });
    if (choice !== 'B') return done?.({ ok: false, message: 'Ese titular añade algo que el informe no demuestra.' });
    room.finalWon = true; broadcast(room); done?.({ ok: true });
  });

  socket.on('game:timeout', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.finalWon) return;
    room.lives = 0; room.failed = true; broadcast(room);
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) if (room.players.delete(socket.id)) {
      if (room.hostId === socket.id) room.hostId = room.players.keys().next().value || null;
      if (!room.players.size) rooms.delete(room.code); else broadcast(room);
      break;
    }
  });
});


server.listen(port, () => console.log(`La Última Edición en puerto ${port}`));
