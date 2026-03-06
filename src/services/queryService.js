import { api } from "./api";

export const getQueries = () => api.get("/queries");

export const getQueryById = (id) => api.get(`/queries/${id}`);

export const createQuery = (data) => api.post("/queries", data);

export const respondToQuery = (id, data) =>
    api.post(`/queries/${id}/respond`, data);

export const getAISuggestion = (id) => api.post(`/queries/${id}/ai-suggestion`);

// Full AI+ML pipeline — standalone call (not tied to a query)
export const generateAIResponse = (message) =>
    api.post("/ai/generate-response", { message });
