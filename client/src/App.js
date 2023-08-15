import './App.css';

import { useEffect, useState, useRef } from "react";

import socketIOClient from 'socket.io-client';

const ENDPOINT = process.env.NODE_ENV === 'production' ? 'https://buzzter.weekofcharity.de' : 'http://localhost:3001';

function App() {
  const socketRef = useRef();
  const [username, setUsername] = useState("");
  const [roomID, setRoomID] = useState("");
  const [adminPasswort, setAdminPasswort] = useState("");
  const [connectedRoom, setConnectedRoom] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [buzzerPressedBy, setBuzzerPressedBy] = useState("");
  const [textField, setTextField] = useState("");

  const handleBuzzerPress = () => {
    socketRef.current.emit("buzzer_press", { room: connectedRoom, username });
  };

  const handleFreeBuzzerPress = () => {
    socketRef.current.emit("free_buzzer");
  };

  const handleLeavePress = () => {
    setRoomID("");
    setAdminPasswort("");
    setConnectedRoom(null);
    setConnectedUsers([]);
    setBuzzerPressedBy("");
    setTextField("");
    socketRef.current.emit("leave_room");
  };

  const connectUserToRoom = () => {
    socketRef.current.emit("connect_to_room", { room: roomID, password: adminPasswort, username });
  };

  const isMyTurn = () => {
    return buzzerPressedBy === username.toLowerCase();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    connectUserToRoom();
  };

  useEffect(() => {
    socketRef.current?.emit("textfield_update", { text: textField });
  }, [textField]);

  useEffect(() => {
    socketRef.current = socketIOClient(ENDPOINT);

    socketRef.current.on("room_update", (data) => {
      setConnectedRoom(data.room);
      setConnectedUsers(data.users);
      setBuzzerPressedBy(data.pressed_by);
    });

    socketRef.current.on("buzzer_was_pressed", (name) => {
      setBuzzerPressedBy(name);
    });

    socketRef.current.on("buzzer_was_freed", () => {
      setBuzzerPressedBy("");
    });
  }, []);

  const renderActiveUsers = () => {
    return connectedUsers.map(user => {
      return <p key={user.name} className={user.isAdmin ? "adminName" : undefined}>{user.name + (user.name === username.toLowerCase() ? " (you)" : "")}</p>;
    });
  };

  return (
    <div className="App">
      
      {connectedRoom ? (
        <>
          <button className="leaveButton" onClick={handleLeavePress}>Leave Room</button>
          <h1>Welcome to Room {connectedRoom}, {username}!</h1>
          <button className={"buzzerButton" + (buzzerPressedBy ? (isMyTurn() ? " green-bg" : " red-bg") : "")} onClick={handleBuzzerPress} disabled={buzzerPressedBy}>
            {buzzerPressedBy ? `Buzzer pressed\nby ${isMyTurn() ? "you" : buzzerPressedBy}` : "Buzzer ready"}
          </button>
          {connectedUsers.find(user => user.name === username.toLowerCase())?.isAdmin && (
            <button className="freeBuzzerButton" onClick={handleFreeBuzzerPress}>Free Buzzer</button>
          )}
          <input type="text" name='textField' placeholder='Answer...' value={textField}
            onChange={(e) => setTextField(e.target.value)}
            autoComplete="off"
          />
          <div className="connectedUsers">
            <h2>Connected Users:</h2>
            {renderActiveUsers()}
          </div>
        </>
      ) : (
        <div className="connectPanel">
          <h1>Connect to Room</h1>
          <form onSubmit={handleSubmit}>
            <input type="text" name='username' placeholder='Username...' value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
            <input type="text" name='roomID' placeholder='Room Number...' value={roomID}
              onChange={(e) => setRoomID(e.target.value)}
              autoComplete="off"
            />
            <input type="text" name='adminPasswort' placeholder='Admin Passwort...' value={adminPasswort}
              onChange={(e) => setAdminPasswort(e.target.value)}
              autoComplete="off"
            />
            <input type="submit" value='Connect'/>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
