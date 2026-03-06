import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3001";

const createSocket = () => {
    return io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        auth: {
            token: localStorage.getItem("authToken")
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });
};

export const socket = createSocket();

// Reconnect with fresh token after login
export const reconnectSocket = () => {
    socket.auth = { token: localStorage.getItem("authToken") };
    socket.disconnect().connect();
};
