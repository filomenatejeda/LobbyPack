import { ArrowRight, Camera, Home, MessageCircle, PackageSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fetchDashboard } from "../../services/homeApi";
import type { DashboardCurrentUser } from "../../types/home";
import "../Settings/Settings.css";
import "./ResidentHelp.css";

type HelpItem = {
  title: string;
  description: string;
  icon: typeof Camera;
};

const helpItems: HelpItem[] = [
  {
    title: "No puedo escanear el QR",
    description:
      "Abre la camara desde Cuenta, acerca el codigo y revisa que haya buena luz. Si no funciona, usa el ingreso manual del QR.",
    icon: Camera,
  },
  {
    title: "Mi paquete no aparece",
    description:
      "Revisa Paquetes pendientes en Cuenta. Si crees que falta un registro, avisa a conserjeria con los datos del envio.",
    icon: PackageSearch,
  },
  {
    title: "Mis datos estan incorrectos",
    description:
      "Tu informacion es solo de lectura. Para cambiar correo, nombre o departamento, contacta a administracion.",
    icon: Home,
  },
  {
    title: "Necesito reportar un problema",
    description:
      "En Cuenta puedes entrar a Reclamos y dejar el detalle asociado al paquete correspondiente.",
    icon: MessageCircle,
  },
];

export default function ResidentHelp() {
  const [currentUser, setCurrentUser] = useState<DashboardCurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const loadResident = async () => {
      setIsLoading(true);
      setStatusMessage("");

      try {
        const dashboard = await fetchDashboard();
        setCurrentUser(dashboard.current_user);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "No se pudo cargar la ayuda.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadResident();
  }, []);

  if (isLoading && !currentUser) {
    return <main className="pageTransitionBlank" aria-hidden="true" />;
  }

  if (currentUser && currentUser.role !== "resident") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="settingsPage residentHelpPage">
      <section className="settingsHero residentHelpHero">
        <p className="settingsEyebrow">Ayuda residente</p>
        <h1>Como podemos ayudarte</h1>
        <p className="settingsLead">
          Encuentra respuestas rapidas para retirar paquetes, revisar tu cuenta y resolver problemas
          comunes.
        </p>
      </section>

      {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}

      <section className="residentHelpActions" aria-label="Accesos rapidos">
        <Link to="/dashboard" className="residentHelpAction">
          <span>Ir a Cuenta</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link to="/configuracion" className="residentHelpAction secondary">
          <span>Ver Informacion</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <section className="residentHelpGrid" aria-label="Temas de ayuda">
        {helpItems.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.title} className="residentHelpCard">
              <div className="residentHelpIcon">
                <Icon size={22} aria-hidden="true" />
              </div>
              <div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="residentHelpNote">
        <p className="settingsLabel">Conserjeria</p>
        <h2>Para casos urgentes, habla directamente con conserjeria</h2>
        <p>
          Si el paquete ya esta en recepcion o necesitas retirar con prioridad, conserjeria puede
          validar el estado del envio y ayudarte con el retiro.
        </p>
      </section>
    </main>
  );
}
