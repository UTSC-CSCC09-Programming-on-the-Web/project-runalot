import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const useSocket = (uri, query) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(uri, {
      // transports: ['websocket'], // Force websocket connection
      withCredentials: true, // Ensure cookies are sent with requests
      query,
    });

    setSocket(newSocket);

    console.log('[useSocket] Socket created with query:', query);

    return () => {
      console.log('[useSocket] Disconnecting socket.');
      newSocket.disconnect();
    };
  }, [uri, JSON.stringify(query)]); // Use JSON.stringify on query for dependency array

  return socket;
};

export default useSocket;
