import { useEffect } from "react";
import { sx } from "./sx";
import { SITE } from "./site";
import { LOCALES, LOCALES_WEB } from "./locales";
import { fmtEUR, PEDIDO_MINIMO_CENTS } from "./menu";
import LtbMark from "./LtbMark";

// Las condiciones citan cifras del reparto: se leen de locales.js para que el
// texto vinculante no se quede desfasado si cambian el envío o el radio.
const REPARTO = LOCALES.rincon.delivery?.activo ? LOCALES.rincon.delivery : null;
// Locales donde se recoge un pedido hecho en la web (Teatinos no tiene pedidos web).
const RECOGIDA = LOCALES_WEB.map((l) => l.name).join(" o ");

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
      <li>Titular: <strong>LA TERRACITA BURGUER ESPAÑA SL</strong> (nombre comercial: La Terracita Burger)</li>
      <li>NIF: B70678818</li>
      <li>Domicilio: Av. del Mediterráneo 139, 29730 Rincón de la Victoria, Málaga (España)</li>
      <li>Correo electrónico: laterracita.burgers@gmail.com</li>
      <li>Teléfonos: 628 053 065 (Teatinos) · 622 220 826 (Rincón de la Victoria)</li>
      <li>Sitio web: https://laterracitaburger.com</li>
    </ul>

    <h2 style={h2}>2. Objeto</h2>
    <p style={p}>
      Este sitio web da a conocer la carta, los locales y los canales de pedido y contacto de La Terracita
      Burger, y permite realizar <strong>pedidos online para recoger en el local
      {REPARTO && <> o, en Rincón de la Victoria, para entrega a domicilio</>}</strong>, con pago online seguro y
      por adelantado a través de la pasarela MONEI
      (ver <a style={ext} href="/condiciones">condiciones de compra</a>). También se puede pedir a domicilio a
      través de plataformas de terceros (Just Eat, Glovo y Uber Eats), y reservar por teléfono.
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
      <li>Responsable: LA TERRACITA BURGUER ESPAÑA SL (La Terracita Burger)</li>
      <li>NIF: B70678818</li>
      <li>Domicilio: Av. del Mediterráneo 139, 29730 Rincón de la Victoria, Málaga (España)</li>
      <li>Correo electrónico: laterracita.burgers@gmail.com</li>
    </ul>

    <h2 style={h2}>2. Qué datos tratamos</h2>
    <p style={p}>
      Navegar por este sitio no requiere registro. El proveedor de alojamiento (Vercel Inc.) puede tratar datos
      técnicos de conexión (como la dirección IP) en sus registros de servidor, necesarios para servir la página
      de forma segura.
    </p>
    <p style={p}>
      Si haces un <strong>pedido online</strong> en la sección «Pedir», tratamos los datos que nos facilitas
      (nombre, teléfono y contenido del pedido y, si eliges entrega a domicilio, la dirección de entrega) con la
      única finalidad de preparar y entregarte el pedido y contactarte si surge alguna duda con él. La base
      jurídica es la ejecución de la relación contractual que solicitas (art. 6.1.b RGPD). Para comprobar que la
      dirección está dentro de la zona de reparto la consultamos en <strong>Nominatim (OpenStreetMap)</strong>,
      que la recibe sin ningún otro dato tuyo y no la conserva asociada a tu persona. También registramos la dirección IP desde la que se envía el pedido y si un
      pedido queda sin recoger, con la única finalidad de prevenir abusos y pedidos fraudulentos (interés
      legítimo, art. 6.1.f RGPD): los teléfonos con pedidos reiterados sin recoger pueden quedar excluidos del
      pedido online (siempre pueden pedir por teléfono). Estos
      datos se almacenan en la plataforma Supabase (encargado del tratamiento) y se conservan durante un máximo
      de 30 días, salvo obligación legal de conservación mayor. No se usan para publicidad ni se ceden a
      terceros.
    </p>
    <p style={p}>
      Para conocer el uso de la web empleamos <strong>Vercel Web Analytics</strong>, un sistema de estadísticas
      anónimas y agregadas (visitas, páginas vistas, país, tipo de dispositivo) que <strong>no usa cookies</strong> ni
      identifica al visitante (<a style={ext} href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noreferrer">más información</a>).
    </p>
    <p style={p}>
      Si nos llamas por teléfono para reservar o hacer un pedido, los datos que nos facilites (nombre, teléfono)
      se usan exclusivamente para gestionar esa reserva o pedido y no se incorporan a otros tratamientos ni se
      ceden a terceros.
    </p>

    <h2 style={h2}>2 bis. Pago online</h2>
    <p style={p}>
      Si eliges pagar online, el pago se procesa en la pasarela segura de <strong>MONEI DIGITAL PAYMENTS,
      S.L.</strong> (encargada del tratamiento de los datos de pago). Los datos de tu tarjeta o cuenta
      <strong> nunca pasan por nuestros servidores ni se almacenan</strong>: nosotros solo recibimos la
      confirmación del cobro, el importe y un identificador de la operación, necesarios para gestionar el
      pedido y posibles reembolsos.
    </p>

    <h2 style={h2}>3. Pedidos a través de plataformas</h2>
    <p style={p}>
      Si pides por Just Eat, Glovo o Uber Eats, el tratamiento de tus datos se rige por las políticas de
      privacidad de cada plataforma, de las que son responsables dichas empresas.
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

const Condiciones = () => (
  <>
    <h2 style={h2}>1. Identificación del vendedor</h2>
    <ul style={ul}>
      <li>Vendedor: <strong>LA TERRACITA BURGUER ESPAÑA SL</strong> (nombre comercial: La Terracita Burger)</li>
      <li>NIF: B70678818</li>
      <li>Domicilio: Av. del Mediterráneo 139, 29730 Rincón de la Victoria, Málaga (España)</li>
      <li>Correo electrónico: laterracita.burgers@gmail.com</li>
      <li>Teléfonos: 628 053 065 (Teatinos) · 622 220 826 (Rincón de la Victoria)</li>
    </ul>

    <h2 style={h2}>2. Objeto y ámbito</h2>
    <p style={p}>
      Estas condiciones regulan los pedidos de comida preparada realizados en la sección «Pedir» de este sitio
      web para su <strong>recogida en el local</strong> ({RECOGIDA})
      {REPARTO && <> y, en <strong>Rincón de la Victoria</strong>, para su <strong>entrega a domicilio</strong> dentro
      de la zona de reparto indicada en el apartado 5</>}. Al enviar un pedido aceptas estas condiciones.
    </p>

    <h2 style={h2}>3. Precios y formas de pago</h2>
    <p style={p}>
      Todos los precios se muestran en <strong>euros (€) con IVA incluido</strong>. El precio final es la suma
      de los productos del carrito, visible antes de confirmar. El pedido mínimo online es de{" "}
      <strong>{fmtEUR(PEDIDO_MINIMO_CENTS)}</strong>.
      {REPARTO && (
        <> En los pedidos a domicilio se añaden <strong>{fmtEUR(REPARTO.gastosCents)} de gastos de envío</strong> y el
        pedido mínimo es de <strong>{fmtEUR(REPARTO.minimoCents)}</strong> (sin contar el envío); ambos importes se
        muestran en el carrito antes de pagar. En la recogida en local no hay gastos de envío ni recargos.</>
      )}
    </p>
    <p style={p}>
      El pago se realiza <strong>online y por adelantado</strong> con tarjeta Visa o Mastercard, Bizum, Apple Pay
      o Google Pay, a través de la pasarela de pago segura de MONEI DIGITAL PAYMENTS, S.L. No almacenamos los
      datos de tu tarjeta; el cargo se efectúa al completar el pago y el pedido se envía a cocina solo tras
      confirmarse el cobro.
    </p>

    <h2 style={h2}>4. Proceso de pedido y pedidos programados</h2>
    <p style={p}>
      Tras el pago, el pedido queda <strong>confirmado cuando el local lo acepta</strong> (lo verás en la
      pantalla de seguimiento, junto con la hora estimada de recogida). Puedes pedir para «lo antes posible» o
      <strong> programarlo</strong> para una hora posterior, incluso fuera del horario de apertura: en ese caso
      lo preparamos para la franja que elijas. Si el local no puede prepararlo (p. ej. por falta de producto),
      lo rechazará y te lo indicará en la misma pantalla, con reembolso automático del importe.
    </p>

    <h2 style={h2}>5. Entrega</h2>
    <p style={p}>
      <strong>Recogida en el local</strong> ({RECOGIDA}): sin gastos de envío. El plazo
      habitual de preparación es de <strong>15 a 40 minutos</strong>; al aceptar tu pedido, el local fija la hora
      estimada de recogida y la ves en la pantalla de seguimiento.
    </p>
    {REPARTO && (
      <p style={p}>
        <strong>Entrega a domicilio</strong>: disponible únicamente desde el local de <strong>Rincón de la
        Victoria</strong> ({LOCALES.rincon.address}), con reparto realizado por el propio establecimiento —no
        interviene ninguna empresa de transporte— dentro del término municipal de{" "}
        <strong>{REPARTO.municipio}</strong> y en un radio máximo de <strong>{REPARTO.radioKm} km</strong> desde el
        local. Al escribir tu dirección comprobamos ambas cosas: si queda fuera de la zona te lo indicamos{" "}
        <strong>antes de pagar</strong>. El reparto tiene un horario propio, más corto que el del local:{" "}
        <strong>solo en el turno de noche, salvo viernes, sábados y domingos, en los que también repartimos al
        mediodía</strong>; fuera de ese horario puedes recoger en el local, dejar el pedido programado o pedirnos
        por las plataformas. Los gastos de envío son de <strong>{fmtEUR(REPARTO.gastosCents)}</strong>. Igual que en
        la recogida, <strong>el local fija la hora estimada al aceptar tu pedido</strong> —depende de la carga de
        cocina y de la distancia— y la ves en la pantalla de seguimiento. Facilita una dirección completa y un teléfono operativo: si al
        llegar no es posible entregarte el pedido en la dirección indicada y no logramos contactar contigo, se
        aplica lo previsto en el apartado 6 para los pedidos no recogidos.
      </p>
    )}
    <p style={p}>
      La entrega a domicilio también está disponible a través de plataformas de terceros (Just Eat, Glovo,
      Uber Eats), que aplican sus propias condiciones, plazos y gastos.
    </p>

    <h2 style={h2}>6. Cancelaciones, devoluciones y reembolsos</h2>
    <ul style={ul}>
      <li>
        <strong>Cancelación por el cliente</strong>: puedes cancelar sin coste <strong>llamando al local antes
        de que el pedido empiece a prepararse</strong>; se reembolsa el importe íntegro. Una vez en preparación,
        la comida se elabora expresamente para ti y ya no es posible cancelar.
      </li>
      <li>
        <strong>Cancelación por el local</strong>: si el local rechaza tu pedido, te lo indicamos en la
        pantalla de seguimiento y el <strong>reembolso es automático e íntegro</strong> por el mismo medio de pago.
      </li>
      <li>
        <strong>Reembolsos totales o parciales</strong>: se emiten siempre por el mismo medio de pago utilizado.
        Si faltara o no fuera correcto un producto concreto, podemos devolver solo la parte correspondiente. El
        abono suele reflejarse en 1-3 días laborables, según tu banco.
      </li>
      <li>
        <strong>Pedido incorrecto o en mal estado</strong>: llámanos o escríbenos y lo solucionamos
        reponiendo el producto o reembolsando su importe.
      </li>
      <li>
        <strong>Pedidos no recogidos o no entregados</strong>: al estar pagados por adelantado, un pedido
        preparado que no se recoja —o que no podamos entregar en la dirección facilitada por no encontrarte ni
        poder contactarte— no da derecho a reembolso automático, al tratarse de comida elaborada expresamente;
        valoraremos cada caso si nos llamas.
      </li>
    </ul>

    <h2 style={h2}>7. Derecho de desistimiento</h2>
    <p style={p}>
      De acuerdo con el artículo 103.d) del Real Decreto Legislativo 1/2007, el derecho de desistimiento no es
      aplicable a bienes que puedan deteriorarse o caducar con rapidez, como la comida preparada. Esto no
      afecta a los derechos del apartado anterior ni a tus derechos como consumidor.
    </p>

    <h2 style={h2}>8. Atención al cliente y legislación</h2>
    <p style={p}>
      Teatinos: 628 053 065 · Rincón de la Victoria: 622 220 826 · laterracita.burgers@gmail.com. Hojas de
      reclamaciones a disposición del cliente en nuestros locales. La relación se rige por la legislación
      española (RDL 1/2007 y Ley 34/2002), sin perjuicio de los fueros que correspondan al consumidor.
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
      seguimiento. Por eso no verás un banner de consentimiento: no hay nada que consentir. La medición de
      visitas se realiza con Vercel Web Analytics, que funciona <strong>sin cookies</strong> y con datos anónimos
      y agregados.
    </p>
    <p style={p}>
      La sección de pedidos online usa el <strong>almacenamiento local del navegador</strong> (localStorage) con
      fines exclusivamente técnicos: recordar el local elegido, el contenido del carrito y el estado de tu
      pedido. Es imprescindible para prestar el servicio que solicitas, no permite rastrearte y está exento de
      consentimiento según la normativa vigente.
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
  "/condiciones": { title: "Términos y condiciones", Body: Condiciones },
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
