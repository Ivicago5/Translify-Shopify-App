import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";

export const links = () => [
  { rel: "stylesheet", href: "@shopify/polaris/build/esm/styles.css" },
];

export async function loader({ request }) {
  await authenticate.admin(request);
  return null;
}

export default function App() {
  useEffect(() => {
    // Initialize any app-wide functionality here
    console.log("Translify app initialized");
  }, []);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider
          i18n={{
            Polaris: {
              ResourceList: {
                sortingLabel: "Sort by",
                defaultItemSingular: "item",
                defaultItemPlural: "items",
              },
              Common: {
                checkbox: "checkbox",
              },
            },
          }}
        >
          <Outlet />
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
} 