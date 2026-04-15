import CoinbaseWalletSDK from "@coinbase/wallet-sdk";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { ethers } from "ethers";
import React, { useCallback, useEffect, useState } from "react";
import Web3Modal from "web3modal";

export const WalletContext = React.createContext();

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      infuraId: process.env.NEXT_PUBLIC_INFURA_ID,
    },
  },
  coinbasewallet: {
    package: CoinbaseWalletSDK,
    options: {
      appName: "BlockGuardian",
      infuraId: process.env.NEXT_PUBLIC_INFURA_ID,
    },
  },
};

// Guard for SSR — Web3Modal must only be instantiated on the client
let web3Modal;
if (typeof window !== "undefined") {
  web3Modal = new Web3Modal({
    network: "mainnet",
    cacheProvider: true,
    providerOptions,
    theme: "dark",
  });
}

// Human-readable network name map
const NETWORK_NAMES = {
  1: "mainnet",
  5: "goerli",
  11155111: "sepolia",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
};

export const WalletProvider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [library, setLibrary] = useState(null);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  const updateBalance = useCallback(
    async (address, lib) => {
      const ethLib = lib || library;
      if (!ethLib || !address) return;
      try {
        const bal = await ethLib.getBalance(address);
        setBalance(ethers.utils.formatEther(bal));
      } catch (err) {
        console.error("Error updating balance:", err);
      }
    },
    [library],
  );

  const connectWallet = useCallback(async () => {
    try {
      const web3Provider = await web3Modal.connect();
      const lib = new ethers.providers.Web3Provider(web3Provider);
      const accounts = await lib.listAccounts();
      const net = await lib.getNetwork();

      setProvider(web3Provider);
      setLibrary(lib);

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const bal = await lib.getBalance(accounts[0]);
        setBalance(ethers.utils.formatEther(bal));
      }

      setNetwork(NETWORK_NAMES[net.chainId] || `chain-${net.chainId}`);
      setChainId(net.chainId);
      setConnected(true);
      setError(null);
    } catch (err) {
      setError(err);
      console.error("Connection error:", err);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      await web3Modal.clearCachedProvider();
      setProvider(null);
      setLibrary(null);
      setAccount(null);
      setNetwork(null);
      setChainId(null);
      setConnected(false);
      setBalance(null);
      setError(null);
    } catch (err) {
      setError(err);
      console.error("Disconnection error:", err);
    }
  }, []);

  const switchNetwork = useCallback(
    async (targetChainId) => {
      try {
        if (!provider) return;
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ethers.utils.hexValue(targetChainId) }],
        });
        setError(null);
      } catch (switchErr) {
        // EIP-3085: if chain not added yet, try adding it
        if (switchErr.code === 4902) {
          setError(
            new Error(
              "This network has not been added to your wallet. Please add it manually.",
            ),
          );
        } else {
          setError(switchErr);
        }
        console.error("Network switch error:", switchErr);
      }
    },
    [provider],
  );

  const handleAccountsChanged = useCallback(
    (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        updateBalance(accounts[0]);
      } else {
        // Wallet locked or all accounts disconnected
        setAccount(null);
        setBalance(null);
        setConnected(false);
      }
    },
    [updateBalance],
  );

  const handleChainChanged = useCallback(
    (newChainIdHex) => {
      const parsedChainId = parseInt(newChainIdHex, 16);
      setChainId(parsedChainId);
      setNetwork(NETWORK_NAMES[parsedChainId] || `chain-${parsedChainId}`);

      if (account) {
        updateBalance(account);
      }
    },
    [account, updateBalance],
  );

  // Auto-reconnect if provider was cached from a previous session
  useEffect(() => {
    if (web3Modal && web3Modal.cachedProvider) {
      connectWallet();
    }
  }, [connectWallet]);

  // Attach/detach wallet event listeners whenever provider changes
  useEffect(() => {
    if (!provider) return;

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", disconnectWallet);

    return () => {
      if (provider.removeListener) {
        provider.removeListener("accountsChanged", handleAccountsChanged);
        provider.removeListener("chainChanged", handleChainChanged);
        provider.removeListener("disconnect", disconnectWallet);
      }
    };
  }, [provider, disconnectWallet, handleAccountsChanged, handleChainChanged]);

  const getContract = useCallback(
    (address, abi) => {
      if (!library) return null;
      return new ethers.Contract(address, abi, library.getSigner());
    },
    [library],
  );

  const callContractMethod = useCallback(async (contract, method, ...args) => {
    try {
      return await contract[method](...args);
    } catch (err) {
      setError(err);
      console.error(`Error calling ${method}:`, err);
      throw err;
    }
  }, []);

  const sendTransaction = useCallback(async (contract, method, ...args) => {
    try {
      const tx = await contract[method](...args);
      return await tx.wait();
    } catch (err) {
      setError(err);
      console.error(`Error in transaction ${method}:`, err);
      throw err;
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        connectWallet,
        disconnectWallet,
        switchNetwork,
        getContract,
        callContractMethod,
        sendTransaction,
        updateBalance,
        clearError,
        provider,
        library,
        account,
        network,
        chainId,
        connected,
        error,
        balance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = React.useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
