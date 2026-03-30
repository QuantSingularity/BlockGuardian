import { useEffect, useState } from "react";

/**
 * Custom hook for handling wallet connection state
 *
 * @param {Object} provider - WalletConnect provider
 * @returns {Object} - Wallet connection state and methods
 */
const useWallet = (provider) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize wallet state from provider
  useEffect(() => {
    if (provider) {
      setIsConnected(provider.isConnected || false);
      setAddress(provider.address || null);
      setChainId(provider.chainId || null);

      // Fetch balance if connected
      if (provider.isConnected && provider.address) {
        fetchBalance();
      }
    }
  }, [provider, fetchBalance]);

  // Connect wallet
  const connect = async () => {
    if (!provider) {
      setError("Wallet provider not available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use provider's connect method
      await provider.open();

      // Update state after connection
      setIsConnected(provider.isConnected || false);
      setAddress(provider.address || null);
      setChainId(provider.chainId || null);

      // Fetch balance if connected
      if (provider.isConnected && provider.address) {
        await fetchBalance();
      }

      return { success: true, address: provider.address };
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(err.message || "Failed to connect wallet");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnect = async () => {
    if (!provider) {
      setError("Wallet provider not available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use provider's disconnect method
      await provider.disconnect();

      // Reset state after disconnection
      setIsConnected(false);
      setAddress(null);
      setChainId(null);
      setBalance("0");

      return { success: true };
    } catch (err) {
      console.error("Wallet disconnection error:", err);
      setError(err.message || "Failed to disconnect wallet");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch wallet balance
  const fetchBalance = async () => {
    if (!provider?.isConnected || !provider.address) {
      return;
    }

    try {
      // This is a placeholder for actual balance fetching logic
      // In a real implementation, you would use ethers.js or web3.js to fetch the balance
      // For example: const balanceWei = await provider.request({ method: 'eth_getBalance', params: [address, 'latest'] });

      // Simulate balance fetch with timeout
      const mockBalance = "1.234"; // This would be replaced with actual balance conversion
      setBalance(mockBalance);

      return mockBalance;
    } catch (err) {
      console.error("Balance fetch error:", err);
      setError(err.message || "Failed to fetch balance");
    }
  };

  // Format address for display
  const formatAddress = (addr = address) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return {
    isConnected,
    address,
    chainId,
    balance,
    isLoading,
    error,
    connect,
    disconnect,
    fetchBalance,
    formatAddress,
  };
};

export default useWallet;
