"use client";

import Image from "next/image";
import { useState } from "react";

const VEHICLE_OPTIONS = ["C278", "C289", "C2910", "C2M10", "C3", "C2S2", "C2S3", "C3S2", "C3S3", "V3"];
const CARROCERIA_OPTIONS = [
  "GENERAL",
  "ESTIBA",
  "PLATAFORMA",
  "ESTACAS GRANEL SOLIDO",
  "ESTIBAS GRANEL SOLIDO",
  "PLATAFORMA GRANEL SOLIDO",
  "FURGON GENERAL",
  "FURGON GRANEL SOLIDO",
  "FURGON REFRIGERADO",
  "PORTACONTENEDORES",
  "TANQUE - GRANEL LIQUIDO",
  "VOLCO",
];

function RouteCard({ route, index, total }) {
  const totalesPorHoras = route.totales_por_horas_cop || route.totales_por_horas;

  return (
    <section className="route-card">
      <div className="route-head">
        <h3 className="route-title">{route.nombre || "Ruta sin nombre"}</h3>
        <span className="route-index">{total > 1 ? `Opcion ${index + 1}` : "Resultado"}</span>
      </div>

      <div className="route-grid">
        {route.id_sice ? (
          <div className="route-stat">
            <span>ID SICE</span>
            <strong>{route.id_sice}</strong>
          </div>
        ) : null}
        {route.total_viaje_cop ? (
          <div className="route-stat">
            <span>Total viaje</span>
            <strong>{route.total_viaje_cop}</strong>
          </div>
        ) : null}
        {route.peajes_cop ? (
          <div className="route-stat">
            <span>Peajes</span>
            <strong>{route.peajes_cop}</strong>
          </div>
        ) : null}
        {totalesPorHoras ? (
          <div className="route-stat" style={{ gridColumn: "1 / -1" }}>
            <span>Totales por horas logisticas</span>
            <strong>
              {Object.entries(totalesPorHoras)
                .map(([key, value]) => `${key}: ${value}`)
                .join(" | ")}
            </strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function Page() {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [vehiculo, setVehiculo] = useState("C3S3");
  const [carroceria, setCarroceria] = useState("GENERAL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen,
          destino,
          vehiculo,
          carroceria,
          resumen: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || data?.detail || "No fue posible consultar la ruta.");
        return;
      }
      setResult(data || null);
    } catch {
      setError("Error de red consultando el servicio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="lab-shell">
      <div className="lab-page">
        <header className="topbar">
          <div className="brand-lockup">
            <Image
              src="/atiemppo-logo.png"
              alt="Atiemppo"
              width={626}
              height={148}
              className="brand-logo"
              priority
            />
            <span className="brand-mark">Agencia de agentes · Consulta instantanea SICETAC</span>
          </div>
          <div className="topbar-links">
            <a className="topbar-link" href="https://atiemppo.com/" target="_blank" rel="noreferrer">
              Ir a atiemppo.com
            </a>
            <a className="topbar-link" href="https://sicealinstante.vercel.app/" target="_blank" rel="noreferrer">
              Abrir version publica
            </a>
            <a className="topbar-link" href="https://www.eldatologistico.com/" target="_blank" rel="noreferrer">
              El Dato Logístico
            </a>
            <a className="topbar-link" href="https://chatgpt.com/g/g-69bb160a06708191a08c3f7177b17306-el-dato-logistico" target="_blank" rel="noreferrer">
              GPT El Dato Logístico
            </a>
          </div>
        </header>

        <section className="hero">
          <article className="hero-card">
            <span className="hero-eyebrow">Herramienta activa · consulta directa</span>
            <h1 className="hero-title">Consulta rutas SICETAC al instante con una experiencia clara y útil.</h1>
            <p className="hero-copy">
              Esta version está pensada para buscar rutas SICETAC usando origen, destino, configuracion vehicular y
              tipo de carroceria. La idea no es mostrar un formulario desnudo, sino una herramienta que se sienta
              parte del ecosistema de Atiemppo.
            </p>
            <div className="hero-actions">
              <a className="hero-link primary" href="#formulario">
                Consultar una ruta
              </a>
              <a className="hero-link" href="https://atiemppo.com/#labs" target="_blank" rel="noreferrer">
                Ver laboratorios Atiemppo
              </a>
              <a className="hero-link" href="https://www.eldatologistico.com/" target="_blank" rel="noreferrer">
                Leer el newsletter
              </a>
              <a className="hero-link" href="https://wa.me/573134503694?text=Hola%2C%20quiero%20consultar%20SICETAC%20al%20Instante%20por%20WhatsApp.%20Escribe%20asi%3A%20origen%20a%20destino" target="_blank" rel="noreferrer">
                Consultar por WhatsApp
              </a>
            </div>
            <div className="hero-metrics">
              <div className="hero-metric">
                <strong>Consulta inmediata</strong>
                <span>origen y destino con salida resumida lista para lectura</span>
              </div>
              <div className="hero-metric">
                <strong>Configuracion editable</strong>
                <span>vehiculo y carroceria ajustables para pruebas reales</span>
              </div>
              <div className="hero-metric">
                <strong>Diagnostico visible</strong>
                <span>resultado, texto resumen y diagnostico tecnico en la misma pantalla</span>
              </div>
            </div>
          </article>

          <aside className="info-card">
            <span className="section-kicker">Como funciona</span>
            <h2 className="info-title">Una interfaz de consulta, no solo un formulario.</h2>
            <ul className="info-list">
              <li>
                <strong>1. Escribe el corredor</strong>
                Ingresa origen y destino de la ruta que quieres consultar.
              </li>
              <li>
                <strong>2. Ajusta el vehiculo</strong>
                Selecciona configuracion y carroceria para acercar mejor la consulta.
              </li>
              <li>
                <strong>3. Lee el resultado</strong>
                Evalua costo total, peajes, horas logistic as y trazabilidad de la respuesta.
              </li>
            </ul>
          </aside>
        </section>

        <section className="content-grid">
          <section className="form-card" id="formulario">
            <span className="section-kicker">Consulta directa</span>
            <h2 className="form-title">Busca una ruta SICETAC.</h2>
            <p className="support-copy">
              Este flujo consulta la ruta con origen y destino separados y aplica la configuracion de vehiculo y
              carroceria seleccionada para entregar una salida resumida.
            </p>

            <form className="lab-form" onSubmit={onSubmit}>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="origen">Origen</label>
                  <input
                    id="origen"
                    name="origen"
                    placeholder="Ej. Bogotá"
                    required
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="destino">Destino</label>
                  <input
                    id="destino"
                    name="destino"
                    placeholder="Ej. Medellín"
                    required
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                  />
                </div>
                <div className="field field-full">
                  <label htmlFor="vehiculo">Tipo de vehiculo</label>
                  <select id="vehiculo" name="vehiculo" value={vehiculo} onChange={(e) => setVehiculo(e.target.value)}>
                    {VEHICLE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="section-card">
                <span className="section-kicker">Carroceria</span>
                <p className="support-copy">
                  Ajusta el tipo de carga para hacer una consulta más representativa del caso de uso.
                </p>
                <div className="carroceria-grid">
                  {CARROCERIA_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCarroceria(c)}
                      className={`carroceria-chip ${carroceria === c ? "active" : ""}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button className="submit-button" type="submit" disabled={loading}>
                {loading ? "Consultando ruta..." : "Consultar ruta al instante"}
              </button>
            </form>
          </section>

          <section className="results-stack">
            <section className="results-card">
              <span className="section-kicker">Resultado</span>
              <h2 className="results-title">Salida de la consulta</h2>
              <p className="support-copy">
                Aqui se muestran las rutas devueltas por SICETAC, con lectura resumida y acceso al diagnostico
                tecnico cuando haga falta revisar el detalle.
              </p>

              {error ? (
                <div className="error-box">
                  <strong>Error:</strong> {error}
                </div>
              ) : null}

              {result?.normalized ? (
                <>
                  <div className="results-meta">
                    <div className="meta-pill">
                      <strong>
                        {result.normalized.meta?.origen || origen} {"->"} {result.normalized.meta?.destino || destino}
                      </strong>
                      <span>Corredor consultado</span>
                    </div>
                    <div className="meta-pill">
                      <strong>{result.normalized.meta?.configuracion || "N/A"}</strong>
                      <span>Configuracion</span>
                    </div>
                    <div className="meta-pill">
                      <strong>{result.normalized.meta?.carroceria || carroceria}</strong>
                      <span>Carroceria</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                    {Array.isArray(result.normalized.routes) && result.normalized.routes.length > 0 ? (
                      result.normalized.routes.map((route, i) => (
                        <RouteCard
                          key={`${route.id_sice || route.nombre || "route"}-${i}`}
                          route={route}
                          index={i}
                          total={result.normalized.routes.length}
                        />
                      ))
                    ) : (
                      <p className="result-empty">No hay resultados para mostrar.</p>
                    )}
                  </div>

                  <details>
                    <summary>Ver texto resumen</summary>
                    <pre>{result.normalized.texto}</pre>
                  </details>
                  <details>
                    <summary>Ver diagnostico tecnico</summary>
                    <pre>{JSON.stringify({ diagnostics: result.diagnostics || null, raw: result.raw || null }, null, 2)}</pre>
                  </details>
                </>
              ) : (
                <p className="result-empty">
                  Aun no hay consulta activa. Completa origen, destino y configuracion para ver la respuesta en esta
                  misma pantalla.
                </p>
              )}
            </section>

            <section className="notes-card">
              <span className="section-kicker">Notas</span>
              <div className="notes-grid">
                <div className="section-card">
                  <strong>Uso recomendado</strong>
                  <p className="support-copy">
                    Explorar rutas existentes, validar configuraciones y obtener una respuesta rápida sin navegar una
                    interfaz técnica.
                  </p>
                </div>
                <div className="section-card">
                  <strong>Salida por defecto</strong>
                  <p className="support-copy">
                    Incluye cálculos con 2, 4 y 8 horas logísticas, además de parámetros ajustables por tipo de
                    vehículo y carrocería.
                  </p>
                </div>
                <div className="section-card">
                  <strong>Más accesos</strong>
                  <p className="support-copy">
                    También puedes abrir el <a href="https://chatgpt.com/g/g-69bb160a06708191a08c3f7177b17306-el-dato-logistico" target="_blank" rel="noreferrer">GPT de El Dato Logístico</a> o escribir al WhatsApp de SICETAC al Instante con este formato:
                    <code> origen a destino </code>. No olvides poner la <code>a</code>.
                  </p>
                </div>
              </div>
              <div className="footer-bar">
                <div>Conectado con <a href="https://atiemppo.com/" target="_blank" rel="noreferrer">atiemppo.com</a> y <a href="https://www.eldatologistico.com/" target="_blank" rel="noreferrer">El Dato Logístico</a>.</div>
                <div>Fuente: Modelo SICETAC · Mintransporte Colombia · Desarrollado por Atiemppo · Febrero 2026.</div>
              </div>
            </section>
          </section>
        </section>
      </div>
    </main>
  );
}
