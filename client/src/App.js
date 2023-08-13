import './App.css';

import { useEffect, useState, useRef } from "react";

import socketIOClient from 'socket.io-client';

const ENDPOINT = 'http://localhost:3001';

function App() {
  const socketRef = useRef();
  const [username, setUsername] = useState("");
  const [roomID, setRoomID] = useState("");
  const [connectedRoom, setConnectedRoom] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [buzzerPressedBy, setBuzzerPressedBy] = useState("");
  const [textField, setTextField] = useState("");

  const handleBuzzerPress = () => {
    socketRef.current.emit("buzzer_press", { room: connectedRoom, username });
  }

  const connectUserToRoom = () => {
    socketRef.current.emit("connect_to_room", { room: roomID, username });
  }

  const isMyTurn = () => {
    return buzzerPressedBy === username.toLowerCase();
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    connectUserToRoom();
  }

  useEffect(() => {
    socketRef.current?.emit("textfield_update", { text: textField });
  }, [textField]);

  useEffect(() => {
    socketRef.current = socketIOClient(ENDPOINT);

    socketRef.current.on("room_update", (data) => {
      setConnectedRoom(data.room);
      setConnectedUsers(data.users);
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
      return <p key={user.name} >{user.name}</p>;
    });
  };

  return (
    <div className="App">
      
      {connectedRoom ? (
        <>
          <h1>Welcome to Room {connectedRoom}, {username}!</h1>
          <button className={"buzzerButton" + (buzzerPressedBy && (isMyTurn() ? " green-bg" : " red-bg"))} onClick={handleBuzzerPress} disabled={buzzerPressedBy}>
            {buzzerPressedBy ? `Buzzer pressed\nby ${isMyTurn() ? "you" : buzzerPressedBy}` : "Buzzer ready"}
          </button>
          <input type="text" name='textField' placeholder='Answer...' value={textField} onChange={(e) => setTextField(e.target.value)} />
          <div>
            <h2>Connected Users:</h2>
            {renderActiveUsers()}
          </div>
        </>
      ) : (
        <>
          <h1>Connect to Room</h1>
          <form onSubmit={handleSubmit}>
            <input id="testo" type="text" name='roomID' placeholder='Room Number...' value={roomID} onChange={(e) => setRoomID(e.target.value)} />
            <input type="text" name='username' placeholder='Username...' value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="submit" value='Connect'/>
          </form>
        </>
      )}
    </div>
  );
}

export default App;
