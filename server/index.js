const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

const users = [];

const addUser = ({ id, name, room }) => {
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

  const user = { id, name, room };

  users.push(user);

  return { user };
};

const removeUser = id => {
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) return users.splice(index, 1)[0];
};

const getUser = id => users.find(user => user.id === id);

const getUsersInRoom = room => users.filter(user => user.room === room);

// Can join specific rooms through socket.io
io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('connect_to_room', ({ room, username }) => {
      const { error, user } = addUser({ id: socket.id, name: username, room }); // add user with socket id and room info
      
      if (error) {
        console.log(error);
        return;
      }

      socket.join(user.room);
  
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
        io.to(user.room).emit('buzzer_was_pressed', {
          name: user.name
        });

        console.log(`${user.name} pressed the buzzer in room ${user.room}!`)
      }
      
    });

    socket.on('disconnect', () => {
      const user = removeUser(socket.id);
    
      if (user) {
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

