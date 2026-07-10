import Landing from "./Landing";
import LegalPage, { LEGAL_ROUTES } from "./LegalPage";

function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return LEGAL_ROUTES.includes(path) ? <LegalPage path={path} /> : <Landing />;
}

export default App;
