import { Navigation } from "@shopify/polaris";
import { HomeIcon, LanguageIcon, SettingsIcon, GlobeIcon } from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

export function NavigationMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: t("NavigationMenu.Dashboard"),
            icon: HomeIcon,
            onClick: () => navigate("/dashboard"),
            selected: location.pathname === "/dashboard",
          },
          {
            label: t("NavigationMenu.Translation Editor"),
            icon: LanguageIcon,
            onClick: () => navigate("/translation-editor"),
            selected: location.pathname === "/translation-editor",
          },
          {
            label: t("NavigationMenu.Glossary"),
            icon: GlobeIcon,
            onClick: () => navigate("/glossary"),
            selected: location.pathname === "/glossary",
          },
          {
            label: t("Settings.title"),
            icon: SettingsIcon,
            onClick: () => navigate("/settings"),
            selected: location.pathname === "/settings",
          },
        ]}
      />
    </Navigation>
  );

  return navigationMarkup;
} 