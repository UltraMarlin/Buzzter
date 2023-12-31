import './App.css';

import { useEffect, useState, useRef, useCallback } from "react";

import socketIOClient from 'socket.io-client';

const ENDPOINT = process.env.NODE_ENV === 'production' ? process.env.REACT_APP_BUZZTER_SERVER_ENDPOINT : 'http://localhost:3001';

function App() {
  const socketRef = useRef();
  const [username, setUsername] = useState("");
  const [roomID, setRoomID] = useState("");
  const [adminPasswort, setAdminPasswort] = useState("");
  const [connectedRoom, setConnectedRoom] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [buzzerPressedBy, setBuzzerPressedBy] = useState("");
  const [textField, setTextField] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleBuzzerPress = useCallback(() => {
    if (!connectedRoom || buzzerPressedBy) return;
    socketRef.current.emit("buzzer_press", { room: connectedRoom, username: username });
  }, [buzzerPressedBy, connectedRoom, username]);

  const handleFreeBuzzerPress = () => {
    socketRef.current.emit("free_buzzer");
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === " " && e.target.tagName !== "INPUT") {
      e.preventDefault();
      handleBuzzerPress();
    }
  }, [handleBuzzerPress]);

  const handleLeavePress = () => {
    setRoomID("");
    setAdminPasswort("");
    setConnectedRoom(null);
    setConnectedUsers([]);
    setBuzzerPressedBy("");
    setTextField("");
    setShowAdminPassword(false);
    socketRef.current.emit("leave_room");
  };

  const handleShowPasswordPress = () => {
    setShowAdminPassword(prev => !prev);
  }

  const isMyTurn = () => {
    return buzzerPressedBy === username.toLowerCase();
  };

  const handleConnectSubmit = (e) => {
    e.preventDefault();
    socketRef.current.emit("connect_to_room", { room: roomID, password: adminPasswort, username });
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

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleKeyDown]);

  const renderActiveUsers = () => {
    return connectedUsers.map(user => {
      return <p key={user.name} className={user.isAdmin ? "adminName" : undefined}>{user.name + (user.name === username.toLowerCase() ? " (you)" : "")}</p>;
    });
  };

  return (
    <div className="App">
      
      {connectedRoom ? (
        <>
          <div className="midPageControls">
            <div className="topButtonBar"></div>
            <button className="leaveButton" onClick={handleLeavePress}>Leave Room</button>
            <button className={"buzzerButton" + (buzzerPressedBy ? (isMyTurn() ? " green-bg" : " red-bg") : "")} onClick={handleBuzzerPress} disabled={buzzerPressedBy}>
              {buzzerPressedBy ? `Buzzer pressed\nby ${isMyTurn() ? "you" : buzzerPressedBy}` : "Buzzer ready"}
            </button>
            {connectedUsers.find(user => user.name === username.toLowerCase())?.isAdmin && (
              <>
                <button className="freeBuzzerButton" onClick={handleFreeBuzzerPress}>Free Buzzer</button>
                <button className={"showPasswordButon" + (showAdminPassword ? " show-pw" : " hide-pw")} onClick={handleShowPasswordPress}>
                  {showAdminPassword ? (adminPasswort || "admin") : "Show Password"}
                </button>
              </>
            )}
            <input type="text" name='textField' placeholder='Answer...' value={textField}
              onChange={(e) => setTextField(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="roomInfoPanel">
            <h2>Room {connectedRoom}</h2>
            <div className="connectedUsers">
              <h2>Connected Users:</h2>
              {renderActiveUsers()}
            </div>
          </div>
        </>
      ) : (
        <div className="connectPanel">
          <h2>Connect to Room</h2>
          <form onSubmit={handleConnectSubmit}>
            <input type="text" name='username' placeholder='Username...' value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
            <input type="text" name='roomID' placeholder='Room Number...' value={roomID}
              onChange={(e) => setRoomID(e.target.value)}
              autoComplete="off"
            />
            <input type="text" name='adminPasswort' placeholder='Admin Password...' value={adminPasswort}
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
