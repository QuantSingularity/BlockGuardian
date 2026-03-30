/**
 * API utility functions for making network requests
 */

// Base API URL - configured based on environment
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

/**
 * Handles API response and error checking
 *
 * @param {Response} response - Fetch API response
 * @returns {Promise} - Resolved with response data or rejected with error
 */
const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  // Parse response based on content type
  const data = isJson ? await response.json() : await response.text();

  // Check if response is successful
  if (!response.ok) {
    // Format error message
    const error = {
      status: response.status,
      statusText: response.statusText,
      message: isJson && data.message ? data.message : "An error occurred",
      data: data,
    };

    throw error;
  }

  return data;
};

/**
 * Creates request options for fetch API
 *
 * @param {string} method - HTTP method
 * @param {Object} data - Request payload
 * @param {string} token - Authentication token
 * @returns {Object} - Fetch request options
 */
const createRequestOptions = (method, data, token) => {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };

  // Add authorization header if token is provided
  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  // Add request body for non-GET requests
  if (data && method !== "GET") {
    options.body = JSON.stringify(data);
  }

  return options;
};

/**
 * Makes a GET request to the API
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @param {string} token - Authentication token
 * @returns {Promise} - Resolved with response data
 */
export const get = async (endpoint, params = {}, token = null) => {
  try {
    // Build query string from params
    const queryString =
      Object.keys(params).length > 0
        ? `?${new URLSearchParams(params).toString()}`
        : "";

    // Make request
    const response = await fetch(
      `${API_BASE_URL}${endpoint}${queryString}`,
      createRequestOptions("GET", null, token),
    );

    return handleResponse(response);
  } catch (error) {
    console.error(`GET ${endpoint} error:`, error);
    throw error;
  }
};

/**
 * Makes a POST request to the API
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request payload
 * @param {string} token - Authentication token
 * @returns {Promise} - Resolved with response data
 */
export const post = async (endpoint, data = {}, token = null) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      createRequestOptions("POST", data, token),
    );

    return handleResponse(response);
  } catch (error) {
    console.error(`POST ${endpoint} error:`, error);
    throw error;
  }
};

/**
 * Makes a PUT request to the API
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request payload
 * @param {string} token - Authentication token
 * @returns {Promise} - Resolved with response data
 */
export const put = async (endpoint, data = {}, token = null) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      createRequestOptions("PUT", data, token),
    );

    return handleResponse(response);
  } catch (error) {
    console.error(`PUT ${endpoint} error:`, error);
    throw error;
  }
};

/**
 * Makes a DELETE request to the API
 *
 * @param {string} endpoint - API endpoint
 * @param {string} token - Authentication token
 * @returns {Promise} - Resolved with response data
 */
export const del = async (endpoint, token = null) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      createRequestOptions("DELETE", null, token),
    );

    return handleResponse(response);
  } catch (error) {
    console.error(`DELETE ${endpoint} error:`, error);
    throw error;
  }
};

/**
 * Makes a PATCH request to the API
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request payload
 * @param {string} token - Authentication token
 * @returns {Promise} - Resolved with response data
 */
export const patch = async (endpoint, data = {}, token = null) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      createRequestOptions("PATCH", data, token),
    );

    return handleResponse(response);
  } catch (error) {
    console.error(`PATCH ${endpoint} error:`, error);
    throw error;
  }
};

export default {
  get,
  post,
  put,
  del,
  patch,
};
