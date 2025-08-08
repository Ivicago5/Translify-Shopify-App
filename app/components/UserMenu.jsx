import { TopBar } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function UserMenu({ open, onToggle }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const userMenuActions = [
    {
      items: [
        { 
          content: t("Settings.title"), 
          onAction: () => {
            navigate('/settings');
            onToggle();
          }
        }
      ],
    },
  ];

  return (
    <TopBar.UserMenu 
      actions={userMenuActions} 
      name="Translify" 
      open={open} 
      onToggle={onToggle} 
    />
  );
} 