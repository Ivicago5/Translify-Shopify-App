import { useState, useCallback } from "react";
import {
  Frame,
  TopBar,
  Loading,
} from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "@shopify/app-bridge-react";
import { Routes } from "./Routes";
import { NavigationMenu } from "./components/NavigationMenu";
import { UserMenu } from "./components/UserMenu";
import { PolarisProvider } from "./components/providers/PolarisProvider";
import { QueryProvider } from "./components/providers/QueryProvider";

// Wrap the app with App Bridge provider
function AppBridgeWrapper({ children }) {
  const host = new URLSearchParams(window.location.search).get("host");
  const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY;
  const isDevMode = process.env.NODE_ENV === 'development';

  // In development mode, always render without App Bridge
  if (isDevMode) {
    return children;
  }

  // In production, require host and API key
  if (!apiKey || !host) {
    console.error('Missing required configuration. Make sure VITE_SHOPIFY_API_KEY and host are set.');
    return (
      <div style={{ padding: "20px" }}>
        <h1>Configuration Error</h1>
        <p>To view this app, you need to:</p>
        <ul>
          <li>Set up your API key in the environment variables</li>
          <li>Access this app through the Shopify Admin</li>
        </ul>
      </div>
    );
  }

  const config = {
    apiKey: apiKey,
    host: host,
    forceRedirect: true
  };

  return <Provider config={config}>{children}</Provider>;
}

export default function App() {
  const { t } = useTranslation();
  const [userMenuActive, setUserMenuActive] = useState(false);
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);

  const toggleUserMenu = useCallback(
    () => setUserMenuActive((userMenuActive) => !userMenuActive),
    []
  );

  const toggleMobileNavigation = useCallback(
    () =>
      setMobileNavigationActive(
        (mobileNavigationActive) => !mobileNavigationActive
      ),
    []
  );

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      userMenu={<UserMenu open={userMenuActive} onToggle={toggleUserMenu} />}
      onNavigationToggle={toggleMobileNavigation}
    />
  );

  return (
    <PolarisProvider>
      <BrowserRouter>
        <AppBridgeWrapper>
          <QueryProvider>
            <Frame topBar={topBarMarkup} navigation={<NavigationMenu />}>
              <Routes />
            </Frame>
          </QueryProvider>
        </AppBridgeWrapper>
      </BrowserRouter>
    </PolarisProvider>
  );
}
