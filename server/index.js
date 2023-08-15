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
        origin: process.env.ORIGIN,
        methods: ["GET", "POST"],
    },
});

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

const roomStates = [];

const getRoomState = room => roomStates.find(roomState => roomState.room === room.trim().toLowerCase());

const addRoomState = ({ room, password, pressed=false, name="" }) => {
  room = room.trim().toLowerCase()
  if (getRoomState(room)) return { roomError: 'Room already initialized.' };

  password = password.trim();
  const roomState = { room, password, pressed, name };

  roomStates.push(roomState);

  return { roomState };
}

const updateBuzzerState = ({ room, pressed, name }) => {
  if (!getRoomState(room)) {
    return;
  }

  let roomState = removeRoomState(room);
  roomState.pressed = pressed;
  roomState.name = name;

  addRoomState(roomState);

  console.log(roomStates);

  return { roomState };
}

const removeRoomState = room => {
  const index = roomStates.findIndex(roomState => roomState.room === room);
  if (index !== -1) return roomStates.splice(index, 1)[0];
}

io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('connect_to_room', ({ room, password, username }) => {
      const existingRoomState = getRoomState(room);
      const isAdmin = !existingRoomState || (existingRoomState && existingRoomState.password === password);
      const { error, user } = addUser({ id: socket.id, name: username, room, isAdmin });

      if (error) {
        console.log(error);
        return;
      }

      socket.join(user.room);

      if (!existingRoomState) {
        password = password ? password : "admin";
        const { roomError, roomState } = addRoomState({ room: room, password });

        if (roomError) {
          console.log(roomError);
          return;
        }

        io.to(user.room).emit('room_update', {
          room: user.room,
          pressed: roomState.pressed,
          pressed_by: roomState.name,
          users: getUsersInRoom(user.room)
        });
      } else {

        io.to(user.room).emit('room_update', {
          room: user.room,
          pressed: existingRoomState.pressed,
          pressed_by: existingRoomState.name,
          users: getUsersInRoom(user.room)
        });
      }

      console.log("User connected:")
      console.log(user);
    });

    socket.on('buzzer_press', () => {
      const user = getUser(socket.id);

      if (user) {
        const roomState = getRoomState(user.room);
        if (roomState?.pressed) return;
        updateBuzzerState({ room: user.room, pressed: true, name: user.name });
        io.to(user.room).emit('buzzer_was_pressed', user.name);
        console.log(`${user.name} pressed the buzzer in room ${user.room}!`);
      }
    });

    socket.on('free_buzzer', () => {
      const user = getUser(socket.id);

      if (user && user.isAdmin) {
        io.to(user.room).emit('buzzer_was_freed');
        updateBuzzerState({ room: user.room, pressed: false, name: "" });
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

    const leave_room = () => { 
      const user = removeUser(socket.id);
    
      if (user) {
        if (getUsersInRoom(user.room).length == 0) {
          console.log(`Last user left room ${user.room}, removing roomState entry.`);
          removeRoomState(user.room);
          console.log(roomStates);
        } else {
          const roomState = getRoomState(user.room);

          io.to(user.room).emit('room_update', {
            room: user.room,
            pressed: roomState.pressed,
            pressed_by: roomState.name,
            users: getUsersInRoom(user.room)
          });
        }

        console.log("User disconnected:")
        console.log(user);
        console.log("All users in room:");
        console.log(getUsersInRoom(user.room));
      }
    };

    socket.on('leave_room', () => {
      leave_room();
    });

    socket.on('disconnect', () => {
      leave_room();
    });
});

server.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

