import './App.css';

import { useEffect, useState } from "react";

function App({ socket }) {
  const [message, setMessage] = useState("");
  const [recievedMessages, setRecievedMessages] = useState([]);
  const sendMessage = () => {
    socket.emit("send_message", { message });
  }

  const handleInputChange = (event) => {
    setMessage(event.target.value);
  }

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setRecievedMessages(prev => [data.message, ...prev]);
    });
    return () => {
      socket.removeAllListeners("receive_message");
    };
  }, [socket]);

  return (
    <div className="App">
      <input placeholder='Message...' onChange= {handleInputChange} value={message} />
      <button onClick={sendMessage}>Send Message</button>
      <h1>Messages:</h1>
      {recievedMessages.map((recievedMessage) => {
        return <p>{recievedMessage}</p>;
      })}
    </div>
  );
}

export default App;
