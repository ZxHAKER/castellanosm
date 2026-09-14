const express = require('express');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = app.listen(process.env.PORT || 3000, () => console.log('Signal Break online'));
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const code = () => Math.random().toString(36).slice(2, 7).toUpperCase();
function state() { return { solved: [], scanned: [], players: {}, started: false }; }
function safeName(name) { return String(name || 'Reportero').replace(/[^a-zA-Záéíóúñ0-9 _-]/g, '').slice(0, 16) || 'Reportero'; }

io.on('connection', socket => {
  socket.on('create', ({ name }) => {
    let id; do id = code(); while (rooms.has(id));
    rooms.set(id, state()); socket.join(id); socket.data.room = id;
    rooms.get(id).players[socket.id] = { name: safeName(name), color: '#ffcf4d' };
    socket.emit('joined', { id, state: rooms.get(id) }); io.to(id).emit('sync', rooms.get(id));
  });
  socket.on('join', ({ id, name }) => {
    id = String(id || '').trim().toUpperCase();
    if (!rooms.has(id)) return socket.emit('notice', 'No encontramos esa transmisión. Revisa el código.');
    socket.join(id); socket.data.room = id;
    rooms.get(id).players[socket.id] = { name: safeName(name), color: ['#6cf0c2','#9d8cff','#ff8494','#57c8ff'][Object.keys(rooms.get(id).players).length % 4] };
    socket.emit('joined', { id, state: rooms.get(id) }); io.to(id).emit('sync', rooms.get(id));
  });
  socket.on('start', () => { const r=rooms.get(socket.data.room); if(r){r.started=true; io.to(socket.data.room).emit('sync',r);} });
  socket.on('scan', token => {
    const r=rooms.get(socket.data.room);
    const checkpoints=['ECO-01','ECO-02','ECO-03','ECO-04','ECO-05','ECO-06','ECO-07'];
    const keys=['classroom','computer','library','cafeteria','radio','lab','principal'];
    if(!r || !r.started) return;
    const expected=checkpoints[r.solved.length];
    if(String(token||'').trim().toUpperCase()!==expected) return socket.emit('notice','Ese QR no corresponde a la siguiente sala. Sigan la ruta de la investigación.');
    const key=keys[r.solved.length];
    if(!r.scanned.includes(key)) r.scanned.push(key);
    io.to(socket.data.room).emit('sync',r);
    socket.emit('scan-result',{key});
  });
  socket.on('solve', key => { const r=rooms.get(socket.data.room); if(r && !r.solved.includes(key)){r.solved.push(key); io.to(socket.data.room).emit('sync',r);} });
  socket.on('disconnect', () => { const r=rooms.get(socket.data.room); if(!r)return; delete r.players[socket.id]; if(Object.keys(r.players).length)io.to(socket.data.room).emit('sync',r); else rooms.delete(socket.data.room); });
});
