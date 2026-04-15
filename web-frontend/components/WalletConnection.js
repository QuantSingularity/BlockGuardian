import { useEffect, useRef, useState } from "react";
import { useWallet } from "./WalletProvider";

const WalletConnection = () => {
  const {
    connectWallet,
    disconnectWallet,
    account,
    network,
    connected,
    balance,
    error,
    clearError,
    switchNetwork,
  } = useWallet();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatBalance = (bal) => {
    if (!bal) return "0.0000";
    return parseFloat(bal).toFixed(4);
  };

  const getNetworkColor = () => {
    const colors = {
      mainnet: "text-green-500",
      goerli: "text-yellow-500",
      sepolia: "text-purple-500",
      polygon: "text-violet-500",
      arbitrum: "text-blue-500",
      optimism: "text-red-500",
      base: "text-cyan-500",
    };
    return colors[network] || "text-gray-500";
  };

  const handleNetworkSwitch = (newChainId) => {
    switchNetwork(newChainId);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {connected ? (
        <div className="flex items-center">
          <div className="mr-4 hidden md:block">
            <div className="text-sm text-gray-400">
              {network && (
                <span className={`${getNetworkColor()} font-medium`}>
                  {network.charAt(0).toUpperCase() + network.slice(1)}
                </span>
              )}
            </div>
            <div className="text-sm font-medium">
              {formatBalance(balance)} ETH
            </div>
          </div>

          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-200"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <span className="mr-2">{formatAddress(account)}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50 top-full overflow-hidden">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                  <div className="font-medium mb-0.5">Account</div>
                  <div className="text-xs font-mono truncate text-gray-500 dark:text-gray-400">
                    {account}
                  </div>
                </div>

                <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                  <div className="font-medium mb-0.5">Balance</div>
                  <div className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    {formatBalance(balance)} ETH
                  </div>
                </div>

                <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                  <div className="font-medium mb-1.5">Switch Network</div>
                  <div className="flex flex-col space-y-1">
                    {[
                      { id: 1, name: "Ethereum Mainnet", key: "mainnet" },
                      { id: 11155111, name: "Sepolia Testnet", key: "sepolia" },
                      { id: 137, name: "Polygon", key: "polygon" },
                      { id: 8453, name: "Base", key: "base" },
                    ].map(({ id, name, key }) => (
                      <button
                        key={id}
                        onClick={() => handleNetworkSwitch(id)}
                        className={`text-left px-2 py-1 rounded-lg text-xs transition-colors duration-150 ${
                          network === key
                            ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    disconnectWallet();
                    setIsDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150"
                  role="menuitem"
                >
                  Disconnect Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors duration-200"
        >
          Connect Wallet
        </button>
      )}

      {error && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs p-3 rounded-xl shadow-lg z-50 flex items-start gap-2">
          <span className="flex-1">{error.message || "An error occurred"}</span>
          <button
            onClick={clearError}
            aria-label="Dismiss error"
            className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletConnection;
