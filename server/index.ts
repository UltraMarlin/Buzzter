"use strict";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { RoomState, UpdateRoomStateData, User } from "./types";
const app = express();

require("dotenv").config();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ORIGIN,
    methods: ["GET", "POST"],
  },
});

const users: User[] = [];
const roomStates: RoomState[] = [];

const addUser = ({ id, name, room, isAdmin }: User) => {
  if (!name || !room) return { error: "Username and room are required." };

  const formattedName = name.trim().toLowerCase();
  const formattedRoom = room.trim().toUpperCase();

  const existingUser = users.find(
    (user) => user.room === formattedRoom && user.name === formattedName
  );
  if (existingUser) return { error: "Username already exists in this room." };

  if (getUser(id)) return { error: "Id already connected." };

  const user = { id, name: formattedName, room: formattedRoom, isAdmin };

  users.push(user);

  return { user };
};

const removeUser = (id: string) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) return users.splice(index, 1)[0];
};

const getUser = (id: string) => users.find((user) => user.id === id);

const getUsersInRoom = (room: string) =>
  users.filter((user) => user.room === room);

const getRoomState = (room: string) =>
  roomStates.find((roomState) => roomState.room === room.trim().toUpperCase());

const getRoomStateIndex = (room: string) =>
  roomStates.findIndex(
    (roomState) => roomState.room === room.trim().toUpperCase()
  );

const addRoomState = ({ room, password, pressed, name }: RoomState) => {
  const formattedRoom = room.trim().toUpperCase();
  if (getRoomState(formattedRoom))
    return { roomError: "Room already initialized." };

  const roomState = {
    room: formattedRoom,
    password,
    pressed,
    name,
  };
  roomStates.push(roomState);
  return { roomState };
};

const removeRoomState = (room: string) => {
  const index = getRoomStateIndex(room);
  if (index === -1) return;

  return roomStates.splice(index, 1)[0];
};

const updateBuzzerState = ({ room, pressed, name }: UpdateRoomStateData) => {
  const roomState = getRoomState(room);
  if (!roomState) return;

  roomState.pressed = pressed;
  roomState.name = name;

  return { roomState };
};

const usersWithoutId = (users: User[]) =>
  users.map((user) => {
    const { id, ...restAttr } = user;
    return { ...restAttr };
  });

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("connect_to_room", (body) => {
    const { room, password, username } = body;
    if (
      typeof room !== "string" ||
      typeof username !== "string" ||
      (typeof password !== "string" && typeof password !== "undefined")
    ) {
      console.log("Recieved malformatted connect_to_room request:");
      console.log(body);
      return;
    }

    const existingRoomState = getRoomState(room);
    const isAdmin =
      !existingRoomState ||
      (existingRoomState && existingRoomState.password === password);
    const { error, user } = addUser({
      id: socket.id,
      name: username,
      room,
      isAdmin,
    });

    if (error) {
      console.log(error);
      return;
    }

    if (!user) return;
    socket.join(user.room);

    if (!existingRoomState) {
      const { roomError, roomState } = addRoomState({
        room: room,
        password: password || "admin",
        pressed: false,
        name: "",
      });

      if (roomError) {
        console.log(roomError);
        return;
      }
      if (!roomState) return;

      io.to(user.room).emit("room_update", {
        room: user.room,
        pressed: roomState.pressed,
        pressed_by: roomState.name,
        users: usersWithoutId(getUsersInRoom(user.room)),
      });
    } else {
      io.to(user.room).emit("room_update", {
        room: user.room,
        pressed: existingRoomState.pressed,
        pressed_by: existingRoomState.name,
        users: usersWithoutId(getUsersInRoom(user.room)),
      });
    }

    console.log("User connected:");
    console.log(user);
  });

  socket.on("buzzer_press", () => {
    const user = getUser(socket.id);

    if (user) {
      const roomState = getRoomState(user.room);
      if (!roomState || roomState?.pressed) return;

      const result = updateBuzzerState({
        room: user.room,
        pressed: true,
        name: user.name,
      });
      if (!result) return;

      io.to(user.room).emit("buzzer_was_pressed", user.name);
      console.log(`${user.name} pressed the buzzer in room ${user.room}!`);
    }
  });

  socket.on("free_buzzer", () => {
    const user = getUser(socket.id);

    if (user && user.isAdmin) {
      io.to(user.room).emit("buzzer_was_freed");
      updateBuzzerState({ room: user.room, pressed: false, name: "" });
      console.log("Buzzer freed.");
    }
  });

  socket.on("textfield_update", (body) => {
    const { text } = body;
    if (typeof text !== "string" && typeof text !== "undefined") {
      console.log("Recieved malformatted textfield_update request:");
      console.log(body);
      return;
    }

    const user = getUser(socket.id);

    if (user) {
      const usersInRoom = getUsersInRoom(user.room);
      usersInRoom.forEach((roomUser) => {
        if (roomUser.isAdmin) {
          io.to(roomUser.id).emit("textfield_update_from", {
            name: user.name,
            text: text || "",
          });
        }
      });
    }
  });

  const leaveRoom = () => {
    const user = removeUser(socket.id);

    if (user) {
      socket.leave(user.room);
      if (getUsersInRoom(user.room).length === 0) {
        console.log(`Last user left room ${user.room}, closing room.`);
        removeRoomState(user.room);
      } else {
        const roomState = getRoomState(user.room);
        if (!roomState) return;

        io.to(user.room).emit("room_update", {
          room: user.room,
          pressed: roomState.pressed,
          pressed_by: roomState.name,
          users: usersWithoutId(getUsersInRoom(user.room)),
        });
      }

      console.log(`User disconnected from room ${user.room}:`);
      console.log(user);
    }
  };

  socket.on("leave_room", () => {
    leaveRoom();
  });

  socket.on("disconnect", () => {
    leaveRoom();
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
