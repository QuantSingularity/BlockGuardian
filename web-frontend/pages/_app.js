import "../styles/globals.css";
import { useEffect, useState } from "react";
import { WalletProvider } from "../components/WalletProvider";

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("darkMode", String(darkMode));
    } catch (e) {
      console.warn(e);
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <WalletProvider>
      <div
        className="min-h-screen transition-colors duration-300"
        suppressHydrationWarning
      >
        <Component
          {...pageProps}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
      </div>
    </WalletProvider>
  );
}

export default MyApp;
