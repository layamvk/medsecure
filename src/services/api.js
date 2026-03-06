import axios from "axios";

export const api = axios.create({
    baseURL: "http://localhost:3001/api",
    headers: {
        "Content-Type": "application/json"
    },
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("authToken");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
    }
);
