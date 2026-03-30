import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

/**
 * Custom hook for persisting state to AsyncStorage
 *
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial state value
 * @returns {Array} - [storedValue, setStoredValue]
 */
const useAsyncStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load from AsyncStorage on mount
  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        setIsLoading(true);
        const item = await AsyncStorage.getItem(key);
        const value = item ? JSON.parse(item) : initialValue;
        setStoredValue(value);
        setError(null);
      } catch (e) {
        console.error("Error loading from AsyncStorage:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredValue();
  }, [key, initialValue]);

  // Update AsyncStorage when state changes
  const setValue = async (value) => {
    try {
      // Allow value to be a function for same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (e) {
      console.error("Error saving to AsyncStorage:", e);
      setError(e);
    }
  };

  // Remove item from AsyncStorage
  const removeValue = async () => {
    try {
      await AsyncStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (e) {
      console.error("Error removing from AsyncStorage:", e);
      setError(e);
    }
  };

  return [storedValue, setValue, { removeValue, isLoading, error }];
};

export default useAsyncStorage;
