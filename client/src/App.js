import './App.css';

import { useEffect, useState, useRef } from "react";

import socketIOClient from 'socket.io-client';

const ENDPOINT = 'http://localhost:3001';

function App() {
  // Input fields
  const socketRef = useRef();
  const [username, setUsername] = useState("");
  const [roomID, setRoomID] = useState("");
  // Internal State
  const [connectedRoom, setConnectedRoom] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const handleBuzzerPress = () => {
    socketRef.current.emit("buzzer_press", { room: connectedRoom, username });
  }

  const connectUserToRoom = () => {
    socketRef.current.emit("connect_to_room", { room: roomID, username });
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    connectUserToRoom();
  }

  useEffect(() => {
    socketRef.current = socketIOClient(ENDPOINT);

    socketRef.current.on("room_update", (data) => {
      setConnectedRoom(data.room);
      setConnectedUsers(data.users);
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
          <h1>Welcome to Room {connectedRoom}</h1>
          <button className="buzzerButton" onClick={handleBuzzerPress}>Buzzer</button>
          <div>
            <h2>Connected Users:</h2>
            {renderActiveUsers()}
          </div>
        </>
      ) : (
        <>
          <h1>Connect to Room</h1>
          <form onSubmit={handleSubmit}>
            <input type="text" name='roomID' placeholder='Room Number...' value={roomID} onChange={(e) => setRoomID(e.target.value)} />
            <input type="text" name='username' placeholder='Username...' value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="submit" value='Connect'/>
          </form>
        </>
      )}
    </div>
  );
}

export default App;
