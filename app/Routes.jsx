import { Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import TranslationEditor from "./pages/TranslationEditor";
import Glossary from "./pages/Glossary";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

export function Routes() {
  return (
    <RouterRoutes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/translation-editor" element={<TranslationEditor />} />
      <Route path="/glossary" element={<Glossary />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
}
