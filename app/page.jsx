"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { BODY_TYPE_OPTIONS, VEHICLE_OPTIONS } from "./lib/sicetac-options";
import { routeErrorMessage } from "./lib/route-errors";

const VEHICLE_LABELS = {
  CA: "Camioneta PBV 3.500–5.000 kg",
  C257: "Camión 2 ejes liviano PBV 5.001–7.000 kg",
  C279: "Camión 2 ejes liviano PBV 7.001–9.000 kg",
  C2910: "Camión 2 ejes liviano PBV 9.001–10.500 kg",
  C2M10: "Camión 2 ejes PBV mayor a 10.500 kg",
  C3: "Camión 3 ejes",
  C2S2: "Tractocamión 2 ejes + semirremolque 2 ejes",
  C2S3: "Tractocamión 2 ejes + semirremolque 3 ejes",
  C3S2: "Tractocamión 3 ejes + semirremolque 2 ejes",
  C3S3: "Tractocamión 3 ejes + semirremolque 3 ejes",
  V2: "Volqueta 2 ejes",
  V3: "Volqueta 3 ejes",
  V4: "Volqueta 4 ejes",
};

function RouteCard({ route, index, total, onDetail, detailLoading }) {
  const totalesPorHoras = route.totales_por_horas_cop || route.totales_por_horas;

  return (
    <section className="route-card">
      <div className="route-head">
        <h3 className="route-title">{route.nombre || "Ruta sin nombre"}</h3>
        <span className="route-index">{total > 1 ? `Opcion ${index + 1}` : "Resultado"}</span>
      </div>

      {route.estimado && <p><strong>Valor estimado:</strong> recorrido urbano de 30 km en terreno ondulado; peajes $0.</p>}
      <div className="route-grid">
        {route.total_km != null && <div className="route-stat"><span>Distancia</span><strong>{route.total_km} km</strong></div>}
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
      {onDetail && <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
        <button type="button" className="submit-button" disabled={detailLoading} onClick={() => onDetail(route, "costos")}>Detalle de costos</button>
        <button type="button" className="submit-button" disabled={detailLoading} onClick={() => onDetail(route, "consumo")}>Detalle de consumo</button>
      </div>}
    </section>
  );
}

const cop = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
const number = (value) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value);

function ModelDetail({ detail }) {
  const { data, tipo } = detail;
  const c = data.detalle_costos;
  return <section className="section-card" style={{ marginTop: 16 }} aria-live="polite">
    <h3>Detalle de {tipo}</h3>
    <p>{data.origen} a {data.destino} · {data.configuracion} · {data.carroceria} · {data.total_km} km · {data.mes}</p>
    {data.estimado && <p><strong>Valor estimado: 30 km en terreno ondulado; peajes $0.</strong></p>}
    {data.sicetac_tradicional?.total_viaje != null && <p><strong>
      {data.sicetac_tradicional.estimado ? "Total SICETAC estimado" : "Total SICETAC"}: {cop(data.sicetac_tradicional.total_viaje)}
    </strong> · {number(data.sicetac_tradicional.horas_logisticas)} horas logísticas · {data.sicetac_tradicional.mes}</p>}
    {tipo === "consumo" ? <>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", textAlign: "left", lineHeight: 2 }}>
        <thead><tr><th>Terreno</th><th>Km</th><th>Galones</th><th>Combustible</th></tr></thead>
        <tbody>{Object.entries(data.detalle_consumo.por_terreno).map(([terreno, row]) => <tr key={terreno}><td>{terreno}</td><td>{number(row.km)}</td><td>{number(row.gal)}</td><td>{cop(row.costo_combustible)}</td></tr>)}</tbody>
      </table></div>
      <p><strong>Consumo total: {number(c.total_galones)} galones · Combustible: {cop(c.combustible)}</strong></p>
    </> : <>
      <p>Galones: {number(c.total_galones)} · Recorrido: {number(c.horas_recorrido)} h · Logística: {number(c.horas_logisticas)} h · Rotaciones al mes: {number(c.rotaciones_calculadas)}</p>
      <dl style={{ lineHeight: 1.8 }}>
        <dt>Costos fijos del viaje</dt><dd>{cop(c.costo_fijo)}</dd>
        <dt>Costos variables</dt><dd>{cop(c.costos_variables)}</dd>
        <dt>Combustible incluido</dt><dd>{cop(c.combustible)}</dd>
        <dt>Peajes incluidos</dt><dd>{cop(c.peajes)}</dd>
        <dt>Mantenimiento e insumos incluidos</dt><dd>{cop(c.mantenimiento)}</dd>
        <dt>Imprevistos incluidos</dt><dd>{cop(c.imprevistos)}</dd>
        <dt>Otros costos</dt><dd>{cop(c.otros_costos)}</dd>
      </dl>
      <p>Costo fijo mensual: {cop(c.costo_fijo_mensual)}, vigente desde {c.mes_costo_fijo}.</p>
    </>}
    <p>Desglose calculado con el modelo completo para esta ruta y configuración.</p>
  </section>;
}

export default function Page() {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [vehiculo, setVehiculo] = useState("C3S3");
  const [carroceria, setCarroceria] = useState(BODY_TYPE_OPTIONS[0]);
  const [modoViaje, setModoViaje] = useState("CARGADO");
  const [tipoContenedor, setTipoContenedor] = useState("CARGADO");
  const [viajeRedondo, setViajeRedondo] = useState(false);
  const [rutasSeleccionadas, setRutasSeleccionadas] = useState({ ida: "", regreso: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const requestSequence = useRef(0);

  function invalidateRoute() {
    requestSequence.current += 1;
    setRutasSeleccionadas({ ida: "", regreso: "" });
    setResult(null);
    setError("");
    setLoading(false);
    setDetail(null);
    setDetailError("");
    setDetailLoading(false);
  }

  async function onDetail(route, tipo) {
    const requestId = ++requestSequence.current;
    setDetailLoading(true); setDetail(null); setDetailError("");
    const context = result.diagnostics.request_payload;
    try {
      const response = await fetch("/api/route", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, rutasid: String(route.id_sice || ""),
          mes: result.normalized.meta.mes, resumen: false, peajes: false,
          horas_logisticas: context.horas_logisticas ?? 4,
          detalle_costos: tipo === "costos", detalle_consumo: tipo === "consumo" }),
      });
      const body = await response.json();
      if (requestId !== requestSequence.current) return;
      if (!response.ok || !body.raw?.detalle_costos) throw new Error(routeErrorMessage(body, "No fue posible calcular el detalle."));
      setDetail({ tipo, data: body.raw });
    } catch (error) {
      if (requestId === requestSequence.current) setDetailError(error.message || "No fue posible calcular el detalle.");
    } finally {
      if (requestId === requestSequence.current) setDetailLoading(false);
    }
  }


  async function onSubmit(e) {
    e.preventDefault();
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError("");
    setResult(null); setDetail(null); setDetailError(""); setDetailLoading(false);

    try {
      const esPortacontenedores = carroceria === "Portacontenedores";
      const esViajeRedondoContenedor = esPortacontenedores && modoViaje === "CARGADO" && viajeRedondo;
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen,
          destino,
          vehiculo,
          carroceria,
          modo_viaje: modoViaje,
          tipo_contenedor: esPortacontenedores && modoViaje === "CARGADO" ? tipoContenedor : null,
          viaje_redondo: esViajeRedondoContenedor,
          tipo_contenedor_regreso: esViajeRedondoContenedor ? "VACIO" : null,
          rutasid_ida: esViajeRedondoContenedor ? rutasSeleccionadas.ida || null : null,
          rutasid_regreso: esViajeRedondoContenedor ? rutasSeleccionadas.regreso || null : null,
          resumen: true,
          peajes: true,
        }),
      });
      const data = await res.json();
      if (requestId !== requestSequence.current) return;
      if (!res.ok) {
        setError(routeErrorMessage(data));
        return;
      }
      setResult(data || null);
    } catch {
      if (requestId === requestSequence.current) setError("Error de red consultando el servicio.");
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
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
                Evalua costo total, peajes, horas logísticas y trazabilidad de la respuesta.
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
              carroceria seleccionada para entregar una salida resumida. “Vacío” en la condición significa vehículo
              sin mercancía ni contenedor; el contenedor vacío se elige aparte dentro de Portacontenedores.
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
                    onChange={(e) => { invalidateRoute(); setOrigen(e.target.value); }}
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
                    onChange={(e) => { invalidateRoute(); setDestino(e.target.value); }}
                  />
                </div>
                <div className="field field-full">
                  <label htmlFor="vehiculo">Tipo de vehiculo</label>
                  <select id="vehiculo" name="vehiculo" value={vehiculo} onChange={(e) => { invalidateRoute(); setVehiculo(e.target.value); }}>
                    {VEHICLE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v} — {VEHICLE_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field field-full">
                  <label htmlFor="modo-viaje">Condición del viaje</label>
                  <select
                    id="modo-viaje"
                    name="modo-viaje"
                    value={modoViaje}
                    onChange={(e) => {
                      invalidateRoute();
                      const modo = e.target.value;
                      setModoViaje(modo);
                      if (modo === "VACIO") setViajeRedondo(false);
                    }}
                  >
                    <option value="CARGADO">Cargado</option>
                    <option value="VACIO">Vacío (sin mercancía ni contenedor)</option>
                  </select>
                </div>
              </div>

              <div className="section-card">
                <span className="section-kicker">Carroceria</span>
                <p className="support-copy">
                  Ajusta el tipo de carga para hacer una consulta más representativa del caso de uso.
                </p>
                <div className="carroceria-grid">
                  {BODY_TYPE_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        invalidateRoute();
                        setCarroceria(c);
                        if (c !== "Portacontenedores") {
                          setTipoContenedor("CARGADO");
                          setViajeRedondo(false);
                        }
                      }}
                      className={`carroceria-chip ${carroceria === c ? "active" : ""}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {carroceria === "Portacontenedores" && modoViaje === "CARGADO" ? (
                  <>
                    <div className="field" style={{ marginTop: 16 }}>
                    <label htmlFor="tipo-contenedor">Tipo de carga</label>
                    <select
                      id="tipo-contenedor"
                      name="tipo-contenedor"
                      value={tipoContenedor}
                      onChange={(e) => {
                        invalidateRoute();
                        setTipoContenedor(e.target.value);
                        if (e.target.value === "VACIO") setViajeRedondo(false);
                      }}
                    >
                      <option value="CARGADO">Contenedor cargado</option>
                      <option value="VACIO">Contenedor vacío</option>
                    </select>
                    <p className="support-copy">
                      El contenedor vacío se consulta como viaje cargado y no tiene valor en plaza.
                    </p>
                    </div>
                    <label className="field" style={{ marginTop: 8 }}>
                      <span>Tipo de recorrido</span>
                      <select
                        id="tipo-recorrido"
                        value={viajeRedondo ? "REDONDO" : "SENCILLO"}
                        onChange={(e) => {
                          invalidateRoute();
                          const redondo = e.target.value === "REDONDO";
                          setViajeRedondo(redondo);
                          if (redondo) setTipoContenedor("CARGADO");
                        }}
                      >
                        <option value="SENCILLO">Viaje sencillo</option>
                        <option value="REDONDO">Viaje redondo: regreso con contenedor vacío</option>
                      </select>
                    </label>
                  </>
                ) : null}
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
                    {result.normalized.meta?.tipo_contenedor ? (
                      <div className="meta-pill">
                        <strong>
                          {result.normalized.meta.tipo_contenedor === "VACIO"
                            ? "Contenedor vacío"
                            : "Contenedor cargado"}
                        </strong>
                        <span>Tipo de carga</span>
                      </div>
                    ) : null}
                  </div>

                  {result.normalized.meta?.valor_plaza_no_aplica === "CONTENEDOR_VACIO" ? (
                    <div className="summary-box" style={{ marginTop: 16 }}>
                      <strong>Contenedor vacío transportado.</strong> Se calculó como viaje cargado; el valor en plaza
                      no aplica para esta referencia.
                    </div>
                  ) : null}

                  {result.normalized.selection_required ? (
                    <div className="section-card" style={{ marginTop: 16 }}>
                      <strong>Selecciona las rutas oficiales para calcular el viaje redondo.</strong>
                      <p className="support-copy">
                        La ida usa contenedor cargado y el regreso usa contenedor vacío. No se mezclan corredores.
                      </p>
                      <div className="field-grid" style={{ marginTop: 12 }}>
                        <div className="field">
                          <label htmlFor="ruta-ida">Ruta de ida</label>
                          <select
                            id="ruta-ida"
                            value={rutasSeleccionadas.ida}
                            onChange={(e) => setRutasSeleccionadas((actual) => ({ ...actual, ida: e.target.value }))}
                          >
                            <option value="">Elige una ruta</option>
                            {(result.normalized.route_options?.ida || []).map((ruta) => (
                              <option key={ruta.id} value={ruta.id}>{`${ruta.id} · ${ruta.nombre}`}</option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor="ruta-regreso">Ruta de regreso</label>
                          <select
                            id="ruta-regreso"
                            value={rutasSeleccionadas.regreso}
                            onChange={(e) => setRutasSeleccionadas((actual) => ({ ...actual, regreso: e.target.value }))}
                          >
                            <option value="">Elige una ruta</option>
                            {(result.normalized.route_options?.regreso || []).map((ruta) => (
                              <option key={ruta.id} value={ruta.id}>{`${ruta.id} · ${ruta.nombre}`}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        className="submit-button"
                        type="button"
                        style={{ marginTop: 14 }}
                        disabled={loading || !rutasSeleccionadas.ida || !rutasSeleccionadas.regreso}
                        onClick={onSubmit}
                      >
                        Calcular viaje redondo
                      </button>
                    </div>
                  ) : null}

                  {detailLoading && <p role="status">Calculando el modelo completo…</p>}
                  {detailError && <p role="alert">{detailError}</p>}
                  {detail && <ModelDetail detail={detail} />}
                  <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                    {Array.isArray(result.normalized.routes) && result.normalized.routes.length > 0 ? (
                      result.normalized.routes.map((route, i) => (
                        <RouteCard
                          key={`${route.id_sice || route.nombre || "route"}-${i}`}
                          route={route}
                          index={i}
                          total={result.normalized.routes.length}
                          detailLoading={detailLoading || loading}
                          onDetail={!result.normalized.meta?.viaje_redondo && result.normalized.meta?.tipo_contenedor !== "VACIO" ? onDetail : null}
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
