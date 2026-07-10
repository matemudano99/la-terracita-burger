import { useEffect } from "react";
import { sx } from "./sx";
import { SITE } from "./site";
import LtbMark from "./LtbMark";

const h2 = sx("margin:44px 0 12px;font-family:'Anton',sans-serif;font-weight:400;font-size:22px;letter-spacing:.02em;text-transform:uppercase;color:#f6f1e9");
const p = sx("margin:0 0 14px;font-size:15.5px;line-height:1.65;color:rgba(246,241,233,.78)");
const ul = sx("margin:0 0 14px;padding-left:22px;font-size:15.5px;line-height:1.65;color:rgba(246,241,233,.78)");
const ext = sx("color:rgb(var(--acc));text-decoration:underline");

const AvisoLegal = () => (
  <>
    <h2 style={h2}>1. Datos identificativos</h2>
    <p style={p}>
      En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
      Información y de Comercio Electrónico (LSSI-CE), se informa de que el titular de este sitio web es:
    </p>
    <ul style={ul}>
      <li>Titular: La Terracita Burger</li>
      <li>NIF/CIF: B70678818</li>
      <li>Domicilio: Av. del Mediterráneo 139, 29730 Rincón de la Victoria, Málaga (España)</li>
      <li>Correo electrónico: laterracita.burgers@gmail.com</li>
      <li>Teléfonos: 628 053 065 (Teatinos) · 622 220 826 (Rincón de la Victoria)</li>
      <li>Sitio web: https://laterracitaburger.com</li>
    </ul>

    <h2 style={h2}>2. Objeto</h2>
    <p style={p}>
      Este sitio web tiene carácter informativo: da a conocer la carta, los locales y los canales de pedido y
      contacto de La Terracita Burger. Los pedidos a domicilio se realizan a través de plataformas de terceros
      (Just Eat, Glovo y Uber Eats) y las reservas por teléfono.
    </p>

    <h2 style={h2}>3. Condiciones de uso</h2>
    <p style={p}>
      El acceso a este sitio web es libre y gratuito. El usuario se compromete a hacer un uso adecuado de los
      contenidos y a no emplearlos para actividades ilícitas o contrarias a la buena fe y al ordenamiento legal.
    </p>

    <h2 style={h2}>4. Propiedad intelectual e industrial</h2>
    <p style={p}>
      Los contenidos de este sitio (textos, fotografías, logotipos, diseño) son titularidad de La Terracita
      Burger o de sus autores y están protegidos por la normativa de propiedad intelectual e industrial. Queda
      prohibida su reproducción, distribución o comunicación pública sin autorización expresa del titular.
    </p>

    <h2 style={h2}>5. Enlaces a terceros</h2>
    <p style={p}>
      El sitio contiene enlaces a plataformas y servicios de terceros (Just Eat, Glovo, Uber Eats, Instagram,
      Facebook, Google Maps). La Terracita Burger no se hace responsable de los contenidos ni de las condiciones
      de dichos sitios, que se rigen por sus propios términos y políticas.
    </p>

    <h2 style={h2}>6. Legislación aplicable</h2>
    <p style={p}>
      La relación entre el titular y el usuario se rige por la legislación española. Para cualquier controversia
      serán competentes los juzgados y tribunales de Málaga, salvo que la normativa disponga otro fuero.
    </p>
  </>
);

const Privacidad = () => (
  <>
    <h2 style={h2}>1. Responsable del tratamiento</h2>
    <ul style={ul}>
      <li>Responsable: La Terracita Burger</li>
      <li>NIF/CIF: B70678818</li>
      <li>Domicilio: Av. del Mediterráneo 139, 29730 Rincón de la Victoria, Málaga (España)</li>
      <li>Correo electrónico: laterracita.burgers@gmail.com</li>
    </ul>

    <h2 style={h2}>2. Qué datos tratamos</h2>
    <p style={p}>
      Este sitio web no incorpora formularios ni sistemas de registro, por lo que <strong>no recoge datos
      personales de los visitantes</strong>. El proveedor de alojamiento (Vercel Inc.) puede tratar datos
      técnicos de conexión (como la dirección IP) en sus registros de servidor, necesarios para servir la página
      de forma segura.
    </p>
    <p style={p}>
      Si nos llamas por teléfono para reservar o hacer un pedido, los datos que nos facilites (nombre, teléfono)
      se usan exclusivamente para gestionar esa reserva o pedido y no se incorporan a otros tratamientos ni se
      ceden a terceros.
    </p>

    <h2 style={h2}>3. Pedidos a través de plataformas</h2>
    <p style={p}>
      Los pedidos a domicilio se realizan en las plataformas Just Eat, Glovo y Uber Eats. Al usarlas, el
      tratamiento de tus datos se rige por las políticas de privacidad de cada plataforma, de las que son
      responsables dichas empresas.
    </p>

    <h2 style={h2}>4. Tus derechos</h2>
    <p style={p}>
      Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y
      portabilidad escribiendo a laterracita.burgers@gmail.com. Si consideras que el tratamiento no se ajusta a la
      normativa, puedes presentar una reclamación ante la Agencia Española de Protección de Datos
      (<a style={ext} href="https://www.aepd.es" target="_blank" rel="noreferrer">www.aepd.es</a>).
    </p>
  </>
);

const Cookies = () => (
  <>
    <h2 style={h2}>1. Qué son las cookies</h2>
    <p style={p}>
      Las cookies son pequeños archivos que los sitios web pueden guardar en tu navegador para recordar
      información sobre tu visita.
    </p>

    <h2 style={h2}>2. Cookies que usa este sitio</h2>
    <p style={p}>
      <strong>Este sitio no instala cookies propias</strong> ni utiliza cookies de análisis, publicidad o
      seguimiento. Por eso no verás un banner de consentimiento: no hay nada que consentir.
    </p>

    <h2 style={h2}>3. Recursos de terceros</h2>
    <p style={p}>Al cargar la página se descargan recursos de terceros que pueden tratar datos técnicos (como tu IP):</p>
    <ul style={ul}>
      <li>
        <strong>Google Fonts</strong> — las tipografías se descargan de servidores de Google
        (<a style={ext} href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">política de privacidad</a>).
      </li>
      <li>
        <strong>OpenStreetMap</strong> — los mapas de la sección Locales se cargan desde openstreetmap.org
        (<a style={ext} href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer">política de privacidad</a>).
      </li>
    </ul>

    <h2 style={h2}>4. Cómo gestionar las cookies</h2>
    <p style={p}>
      Puedes bloquear o eliminar cookies desde la configuración de tu navegador (Chrome, Firefox, Safari, Edge).
      Si en el futuro este sitio incorporase cookies que requieran consentimiento, esta política se actualizará y
      se solicitará mediante el banner correspondiente.
    </p>
  </>
);

const PAGES = {
  "/aviso-legal": { title: "Aviso legal", Body: AvisoLegal },
  "/privacidad": { title: "Política de privacidad", Body: Privacidad },
  "/cookies": { title: "Política de cookies", Body: Cookies },
};

export const LEGAL_ROUTES = Object.keys(PAGES);

export default function LegalPage({ path }) {
  const { title, Body } = PAGES[path];

  useEffect(() => {
    document.title = `${title} · La Terracita Burger`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div style={sx("min-height:100vh;display:flex;flex-direction:column")}>
      <header style={sx("display:flex;align-items:center;justify-content:space-between;padding:22px clamp(16px,4vw,34px)")}>
        <a href="/" aria-label="La Terracita Burger — volver a la página principal" style={sx("display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:#221913;text-decoration:none;box-shadow:0 6px 22px rgba(0,0,0,.55)")}>
          <LtbMark size={19} style={{ color: "#f6f1e9" }} />
        </a>
        <a href="/" style={sx("color:rgba(246,241,233,.75);text-decoration:none;font-size:14px")}>← Volver a la web</a>
      </header>

      <main style={sx("flex:1;width:100%;max-width:760px;margin:0 auto;padding:30px clamp(16px,5vw,34px) 70px")}>
        <h1 style={sx("margin:0 0 6px;font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(32px,6vw,52px);line-height:1;letter-spacing:.01em;text-transform:uppercase")}>{title}</h1>
        <p style={sx("margin:0 0 34px;font-size:13px;color:rgba(246,241,233,.5)")}>Última actualización: julio de 2026</p>
        <Body />
      </main>

      <footer style={sx("padding:22px clamp(16px,5vw,34px);border-top:1px solid rgba(246,241,233,.1);display:flex;flex-wrap:wrap;gap:10px 22px;justify-content:center;font-size:12px;color:rgba(246,241,233,.6)")}>
        <span>© 2026 La Terracita Burger · Málaga</span>
        {LEGAL_ROUTES.filter((r) => r !== path).map((r) => (
          <a key={r} href={r} style={sx("color:rgba(246,241,233,.6)")}>{PAGES[r].title}</a>
        ))}
        <a href={SITE.instagram} target="_blank" rel="noreferrer" style={sx("color:rgba(246,241,233,.6)")}>Instagram</a>
      </footer>
    </div>
  );
}
