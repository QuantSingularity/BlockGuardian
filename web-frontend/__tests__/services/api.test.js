// Mock axios before importing the API service
jest.mock("axios", () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };
  return mockAxios;
});

import axios from "axios";
import { authAPI, healthAPI, portfolioAPI } from "../../services/api";

describe("API Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  describe("authAPI", () => {
    test("login should return response data", async () => {
      const mockResponse = {
        data: { tokens: { access_token: "test_token" }, user: { id: 1 } },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await authAPI.login("test@example.com", "password");
      expect(result).toEqual(mockResponse.data);
    });

    test("register should return response data", async () => {
      const mockResponse = {
        data: { message: "User registered successfully" },
      };
      axios.post.mockResolvedValue(mockResponse);

      const userData = {
        email: "test@example.com",
        username: "testuser",
        password: "password123",
        first_name: "Test",
        last_name: "User",
      };

      const result = await authAPI.register(userData);
      expect(result).toEqual(mockResponse.data);
    });

    test("logout should clear local storage", async () => {
      axios.post.mockResolvedValue({ data: {} });
      await authAPI.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith("access_token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("refresh_token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("user");
    });
  });

  describe("portfolioAPI", () => {
    test("getAll should fetch all portfolios", async () => {
      const mockResponse = {
        data: { portfolios: [] },
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await portfolioAPI.getAll();
      expect(result).toEqual(mockResponse.data);
    });

    test("create should create a portfolio", async () => {
      const mockResponse = {
        data: { id: 1, name: "Test Portfolio" },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await portfolioAPI.create({ name: "Test Portfolio" });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("healthAPI", () => {
    test("check should return health status", async () => {
      const mockResponse = {
        data: { status: "healthy" },
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await healthAPI.check();
      expect(result).toEqual(mockResponse.data);
    });

    test("getInfo should return API info", async () => {
      const mockResponse = {
        data: { name: "BlockGuardian API", version: "1.0.0" },
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await healthAPI.getInfo();
      expect(result).toEqual(mockResponse.data);
    });
  });
});
