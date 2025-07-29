import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const useSocket = (uri, query) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!uri) return;

    const newSocket = io(uri, {
      // transports: ['websocket'], // Force websocket connection
      withCredentials: true, // Ensure cookies are sent with requests
      query,
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [uri, JSON.stringify(query)]); // Use JSON.stringify on query for dependency array

  return socket;
};

export default useSocket;
