const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

const ADMIN_SECRET = process.env.ADMIN_SECRET;

const users = [];

const addUser = ({ id, name, room, isAdmin }) => {
  name = name.trim().toLowerCase();
  room = room.trim().toLowerCase();

  const existingUser = users.find(
    user => user.room === room && user.name === name
  );

  const existingId = users.find(
    user => user.id === id
  );

  if (!name || !room) return { error: 'Username and room are required.' };
  if (existingUser) return { error: 'Username already exists.' };
  if (existingId) return { error: 'Id already connected.' };

  const user = { id, name, room, isAdmin };

  users.push(user);

  return { user };
};

const removeUser = id => {
  const index = users.findIndex(user => user.id === id);
  if (index !== -1) return users.splice(index, 1)[0];
};

const getUser = id => users.find(user => user.id === id);

const getUsersInRoom = room => users.filter(user => user.room === room);

const buzzerStates = [];

const getBuzzerState = room => buzzerStates.find(buzzerState => buzzerState.room === room);

const addBuzzerState = ({ room, pressed=false }) => {
  if (getBuzzerState(room)) return { error: 'Room already initialized.' };

  const buzzerState = { room, pressed };

  buzzerStates.push(buzzerState);
}

const updateBuzzerState = ({ room, pressed }) => {
  if (!getBuzzerState(room)) {
    addBuzzerState({room, pressed});
    return;
  }

  let buzzerState = removeBuzzerState(room);
  buzzerState.pressed = pressed;

  addBuzzerState(buzzerState);

  console.log(buzzerStates);

  return { buzzerState };
}

const removeBuzzerState = room => {
  const index = buzzerStates.findIndex(buzzerState => buzzerState.room === room);
  if (index !== -1) return buzzerStates.splice(index, 1)[0];
}

// Can join specific rooms through socket.io
io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('connect_to_room', ({ room, username, secret = "_" }) => {
      const isAdmin = secret === ADMIN_SECRET;
      const { error, user } = addUser({ id: socket.id, name: username, room, isAdmin }); // add user with socket id and room info
      
      if (error) {
        console.log(error);
        return;
      }

      socket.join(user.room);

      addBuzzerState({ room: user.room, pressed: false });
  
      io.to(user.room).emit('room_update', {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
      
      console.log("User connected:")
      console.log(user);
      console.log("All users in room:");
      console.log(getUsersInRoom(user.room));
    });

    socket.on('buzzer_press', () => {
      const user = getUser(socket.id);

      if (user) {
        const buzzerState = getBuzzerState(user.room);
        if (buzzerState?.pressed) return;
        updateBuzzerState({ room: user.room, pressed: true });
        io.to(user.room).emit('buzzer_was_pressed', user.name);
        console.log(`${user.name} pressed the buzzer in room ${user.room}!`);
      }
    });

    socket.on('free_buzzer', () => {
      const user = getUser(socket.id);

      if (user && user.isAdmin) {
        io.to(user.room).emit('buzzer_was_freed');
        updateBuzzerState({ room: user.room, pressed: false });
        console.log("Buzzer freed.");
      }
    });

    socket.on('textfield_update', ({ text }) => {
      const user = getUser(socket.id);

      if (user) {
        const usersInRoom = getUsersInRoom(user.room);
        usersInRoom.forEach(roomUser => {
          if (roomUser.isAdmin) {
            io.to(roomUser.id).emit('textfield_update_from', {
              name: user.name,
              text: text
            });
          }
        });
      }
    });

    socket.on('disconnect', () => {
      const user = removeUser(socket.id);
    
      if (user) {
        if (getUsersInRoom(user.room).length == 0) {
          console.log(`Last user left room ${user.room}, removing buzzerState entry.`);
          removeBuzzerState(user.room);
          console.log(buzzerStates);
        }

        io.to(user.room).emit('room_update', {
          room: user.room,
          users: getUsersInRoom(user.room)
        });

        console.log("User disconnected:")
        console.log(user);
        console.log("All users in room:");
        console.log(getUsersInRoom(user.room));
      }
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

