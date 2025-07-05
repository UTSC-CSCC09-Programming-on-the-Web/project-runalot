import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const useSocket = (uri) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(uri, {
      transports: ['websocket'], // Force websocket connection
    });

    setSocket(newSocket);

    console.log('[useSocket] Socket created.');

    return () => {
      console.log('[useSocket] Disconnecting socket.');
      newSocket.disconnect();
    };
  }, [uri]);

  return socket;
};

export default useSocket;
