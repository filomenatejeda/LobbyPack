import { UpdatePasswordForm } from "@/components/auth";
import { Link } from "react-router-dom";
import "./Auth.css";


export default function Update_Password() {
  return (
    <main className="authPage">
      <div className="authTopbar">
        <div className="authTopbarInner">
          <Link to="/" className="authBrand">
            LobbyPack
          </Link>
          <div className="authTopLinks">
            <a href="/#inicio" className="authHomeLink">Inicio</a>
            <a href="/#funciones" className="authHomeLink">Funciones</a>
            <a href="/#como-funciona" className="authHomeLink">Cómo funciona</a>
            <a href="/#acceso" className="authHomeLink">Acceso</a>
          </div>
        </div>
      </div>
      <section className="authHero">
        <div className="authMain">
          <div className="authLayout">
            <div className="authPanel">
              <UpdatePasswordForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
