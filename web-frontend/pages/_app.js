import "../styles/globals.css";
import { useEffect, useState } from "react";
import { WalletProvider } from "../components/WalletProvider";

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check user preference for dark mode
    if (typeof window !== "undefined") {
      const isDarkMode =
        localStorage.getItem("darkMode") === "true" ||
        (!localStorage.getItem("darkMode") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setDarkMode(isDarkMode);
    }
  }, []);

  useEffect(() => {
    // Apply dark mode class to document
    if (mounted) {
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      // Save preference
      if (typeof window !== "undefined") {
        localStorage.setItem("darkMode", darkMode);
      }
    }
  }, [darkMode, mounted]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <WalletProvider>
      <div className="min-h-screen transition-colors duration-300">
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
