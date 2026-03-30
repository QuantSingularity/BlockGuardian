import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

/**
 * Custom hook for monitoring network connectivity
 *
 * @returns {Object} - Network state information
 */
const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState(null);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
      setConnectionType(state.type);
      setIsInternetReachable(state.isInternetReachable);
      setDetails(state.details);
    });

    // Initial fetch of network state
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected);
      setConnectionType(state.type);
      setIsInternetReachable(state.isInternetReachable);
      setDetails(state.details);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    connectionType,
    isInternetReachable,
    details,
    isWifi: connectionType === "wifi",
    isCellular: connectionType === "cellular",
    isOffline: !isConnected,
  };
};

export default useNetworkStatus;
