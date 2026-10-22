import { lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import Landing from "./Landing";
import LegalPage, { LEGAL_ROUTES } from "./LegalPage";
import { LOCALES, CARTA_POR_DEFECTO } from "./locales";

// Carga diferida: el visitante de la portada no descarga el código de pedidos.
const PedirPage = lazy(() => import("./pedir/PedirPage"));
const CocinaPage = lazy(() => import("./cocina/CocinaPage"));
const AdminPage = lazy(() => import("./admin/AdminPage"));
const PagoSimulado = lazy(() => import("./pedir/PagoSimulado"));
const CartaPage = lazy(() => import("./carta/CartaPage"));

function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  let page;
  if (path === "/pedir") page = <PedirPage />;
  // /carta/teatinos y /carta/rincon: la carta de ese local (lo que abre el QR
  // de cada uno). /carta a secas, o un local que no existe, abre la de Teatinos.
  else if (path === "/carta" || path.startsWith("/carta/")) {
    const id = path.slice("/carta/".length);
    page = <CartaPage local={LOCALES[id] ? id : CARTA_POR_DEFECTO} />;
  }
  else if (path === "/cocina") page = <CocinaPage />;
  else if (path === "/admin") page = <AdminPage />;
  else if (path === "/pago-simulado") page = <PagoSimulado />;
  else if (LEGAL_ROUTES.includes(path)) page = <LegalPage path={path} />;
  else page = <Landing />;

  return (
    <>
      <Suspense fallback={null}>{page}</Suspense>
      <Analytics />
    </>
  );
}

export default App;
