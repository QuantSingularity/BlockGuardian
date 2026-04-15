/**
 * API Service Layer
 * Handles all HTTP requests to the backend API
 */

import axios from "axios";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  STORAGE_KEYS,
} from "../utils/constants";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== "undefined") {
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          try {
            const response = await axios.post(
              `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
              { refresh_token: refreshToken },
            );
            const { access_token } = response.data;
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return apiClient(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
            return Promise.reject(refreshError);
          }
        }
      }
    }

    // Handle other errors
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      ERROR_MESSAGES.SERVER_ERROR;

    const apiError = new Error(errorMessage);
    apiError.status = error.response?.status;
    apiError.data = error.response?.data;
    return Promise.reject(apiError);
  },
);

/**
 * Authentication API calls
 */
export const authAPI = {
  login: async (email, password) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
    });
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post(
      API_ENDPOINTS.AUTH.REGISTER,
      userData,
    );
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      // Clear local storage regardless of API response
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    }
  },

  getCurrentUser: async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, {
      refresh_token: refreshToken,
    });
    return response.data;
  },
};

/**
 * Portfolio API calls
 */
export const portfolioAPI = {
  getAll: async () => {
    const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.LIST);
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(API_ENDPOINTS.PORTFOLIO.DETAIL(id));
    return response.data;
  },

  create: async (portfolioData) => {
    const response = await apiClient.post(
      API_ENDPOINTS.PORTFOLIO.CREATE,
      portfolioData,
    );
    return response.data;
  },

  update: async (id, portfolioData) => {
    const response = await apiClient.put(
      API_ENDPOINTS.PORTFOLIO.UPDATE(id),
      portfolioData,
    );
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(API_ENDPOINTS.PORTFOLIO.DELETE(id));
    return response.data;
  },
};

/**
 * Blockchain API calls
 */
export const blockchainAPI = {
  explore: async (query) => {
    const response = await apiClient.get(API_ENDPOINTS.BLOCKCHAIN.EXPLORE, {
      params: { q: query },
    });
    return response.data;
  },

  getTransaction: async (hash) => {
    const response = await apiClient.get(
      API_ENDPOINTS.BLOCKCHAIN.TRANSACTION(hash),
    );
    return response.data;
  },

  getAddress: async (address) => {
    const response = await apiClient.get(
      API_ENDPOINTS.BLOCKCHAIN.ADDRESS(address),
    );
    return response.data;
  },

  getBlock: async (blockNumber) => {
    const response = await apiClient.get(
      API_ENDPOINTS.BLOCKCHAIN.BLOCK(blockNumber),
    );
    return response.data;
  },
};

/**
 * Analytics API calls
 */
export const analyticsAPI = {
  getMarketData: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.ANALYTICS.MARKET, {
      params,
    });
    return response.data;
  },

  getAIRecommendations: async (params = {}) => {
    const response = await apiClient.get(
      API_ENDPOINTS.ANALYTICS.AI_RECOMMENDATIONS,
      {
        params,
      },
    );
    return response.data;
  },
};

/**
 * Admin API calls
 */
export const adminAPI = {
  getUsers: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.USERS, { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.STATS);
    return response.data;
  },
};

/**
 * Health check
 */
export const healthAPI = {
  check: async () => {
    const response = await apiClient.get(API_ENDPOINTS.HEALTH);
    return response.data;
  },

  getInfo: async () => {
    const response = await apiClient.get(API_ENDPOINTS.INFO);
    return response.data;
  },
};

export default apiClient;
