import axios from 'axios';

// Base API configuration for Node.js backend
const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api/' : 'http://localhost:3001/api/',
  withCredentials: true, // Send cookies for refresh token
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or other storage
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Strip leading slash so paths resolve correctly against baseURL
    // e.g. '/queries' → 'queries' → 'http://localhost:3001/api/queries'
    if (config.url && config.url.startsWith('/') && !config.url.startsWith('//')) {
      config.url = config.url.slice(1);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (response) => {
    // Handle successful responses - extract data if it's in success format
    if (response.data && response.data.success !== undefined) {
      return response.data.success ? response : Promise.reject(response.data);
    }
    return response;
  },
  async (err) => {
    const originalRequest = err.config;

    if (err.response) {
      const status = err.response.status;
      const errorData = err.response.data;

      const isAuthLoginRequest =
        originalRequest && typeof originalRequest.url === 'string'
          ? originalRequest.url.includes('/auth/login')
          : false;
      const isAuthRefreshRequest =
        originalRequest && typeof originalRequest.url === 'string'
          ? originalRequest.url.includes('/auth/refresh')
          : false;

      // Only attempt token refresh for protected resource requests where we already had a token,
      // and never for the login or refresh endpoints themselves.
      const hasStoredToken = !!localStorage.getItem('authToken');

      if (status === 401 && !originalRequest._retry && !isAuthLoginRequest && !isAuthRefreshRequest && hasStoredToken) {
        // Token expired or invalid - attempt refresh
        if (isRefreshing) {
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              return api(originalRequest);
            })
            .catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Attempt refresh using cookie-stored refresh token
          const response = await api.post('auth/refresh');

          if (response.data && response.data.success && response.data.token) {
            const newToken = response.data.token;

            // Store new token
            localStorage.setItem('authToken', newToken);

            // Update default headers
            api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
            originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

            // Process queued requests
            processQueue(null, newToken);

            // Retry original request
            return api(originalRequest);
          } else {
            throw new Error('Invalid refresh response');
          }
        } catch (refreshError) {
          // Refresh failed - redirect to login
          processQueue(refreshError, null);

          // Clear stored tokens
          localStorage.removeItem('authToken');
          delete api.defaults.headers.common['Authorization'];

          // Redirect to login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else if (status === 403) {
        // Forbidden - could be insufficient permissions or device trust
        return Promise.reject(err);
      } else if (status === 429) {
        // Rate limited
        return Promise.reject(err);
      } else if (status >= 500) {
        // Server error
        console.error('Server error:', errorData);
        return Promise.reject(err);
      }
    } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response) {
      // Network error
      return Promise.reject(err);
    }

    return Promise.reject(err);
  }
);

// Helper function to handle API responses
export const handleApiResponse = (response) => {
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data?.error || 'Unknown error occurred');
};

// Helper function to handle API errors
export const handleApiError = (error) => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  } else if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Set auth token helper
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('authToken');
    delete api.defaults.headers.common['Authorization'];
  }
};

// Clear auth token helper
export const clearAuthToken = () => {
  localStorage.removeItem('authToken');
  delete api.defaults.headers.common['Authorization'];
};

export default api;
