export type User = {
  id: string;
  name: string;
  room: string;
  isAdmin: boolean;
};

export type RoomState = {
  room: string;
  password: string;
  pressed: boolean;
  name: string;
};

export type UpdateRoomStateData = {
  room: string;
  pressed: boolean;
  name: string;
};
