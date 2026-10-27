"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Aviso, Boton, Modal } from "./ui";
import { useStore } from "@/lib/store";

/** reanudar tras la parada: usted elige qué autorizaciones vuelven; las demás piden aprobación otra vez */
export function Reanudar({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { autorizaciones, tareas, reanudar } = useStore();
  const suspendidas = autorizaciones.filter((a) => a.estado === "suspendida");
  const congeladas = tareas.filter((t) => t.estado === "detenida" && t.antes).length;
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (abierto) setElegidas([]);
  }, [abierto]);

  const confirmar = async () => {
    setCargando(true);
    await reanudar(elegidas);
    setCargando(false);
    onCerrar();
  };

  return (
    <Modal
      abierto={abierto}
      titulo="Reanudar a Sam"
      onCerrar={onCerrar}
      ancho={520}
      pie={
        <>
          <button className="btn btn-ghost" onClick={onCerrar}>
            Seguir detenido
          </button>
          <Boton icono={<Play size={16} />} cargando={cargando} onClick={confirmar}>
            Confirmar y reanudar
          </Boton>
        </>
      }
    >
      <div className="form-col">
        <p className="muted">
          Vuelven a su estado {congeladas} tareas congeladas. Las autorizaciones que no marque se quedan en modo aprobación: Sam propone y usted decide.
        </p>
        {suspendidas.length === 0 ? (
          <Aviso tono="info">No había ninguna autorización activa en el momento de la parada.</Aviso>
        ) : (
          <div className="checks">
            {suspendidas.map((a) => (
              <label key={a.id} className={`opcion ${elegidas.includes(a.id) ? "on" : ""}`}>
                <input type="checkbox" checked={elegidas.includes(a.id)} onChange={(e) => setElegidas((xs) => (e.target.checked ? [...xs, a.id] : xs.filter((x) => x !== a.id)))} />
                <span>
                  <strong>{a.nombre}</strong>
                  <small>{a.limites.join(" · ")}</small>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
