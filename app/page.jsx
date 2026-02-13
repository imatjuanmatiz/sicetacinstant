"use client";

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
  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>
        {total > 1 ? `Ruta ${index + 1}` : "Resultado"}: {route.nombre}
      </h3>
      {route.id_sice ? <p style={{ margin: "4px 0" }}>ID SICE: {route.id_sice}</p> : null}
      {route.total_viaje_cop ? <p style={{ margin: "4px 0" }}>Total viaje: {route.total_viaje_cop}</p> : null}
      {route.peajes_cop ? <p style={{ margin: "4px 0" }}>Peajes: {route.peajes_cop}</p> : null}
      {route.totales_por_horas || route.totales_por_horas_cop ? (
        <p style={{ margin: "4px 0" }}>
          Totales por horas:{" "}
          {Object.entries(route.totales_por_horas_cop || route.totales_por_horas)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" | ")}
        </p>
      ) : null}
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
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>SICETAC AL INSTANTE:</h1>
      <p>Proyecto: SICETAC-LAB : Calcula la ruta con los valores de SICETAC con origen/destino separados y parametros editables.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          name="origen"
          placeholder="Origen (ej. Bogota)"
          required
          value={origen}
          onChange={(e) => setOrigen(e.target.value)}
        />
        <input
          name="destino"
          placeholder="Destino (ej. Medellin)"
          required
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        />
        <label>
          Tipo de vehiculo:
          <select
            name="vehiculo"
            value={vehiculo}
            onChange={(e) => setVehiculo(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            {VEHICLE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p style={{ margin: "0 0 6px 0" }}>Tipo de carga / carroceria:</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CARROCERIA_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCarroceria(c)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #999",
                  background: carroceria === c ? "#222" : "#fff",
                  color: carroceria === c ? "#fff" : "#000",
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Consultando..." : "Consultar"}
        </button>
      </form>

      {error ? (
        <p style={{ marginTop: 16, color: "#b00020" }}>
          <strong>Error:</strong> {error}
        </p>
      ) : null}

      {result?.normalized ? (
        <section style={{ marginTop: 20, display: "grid", gap: 12 }}>
          <h2 style={{ marginBottom: 0 }}>
            {result.normalized.meta?.origen} {"->"} {result.normalized.meta?.destino}
          </h2>
          <p style={{ margin: 0 }}>
            Configuracion: {result.normalized.meta?.configuracion || "N/A"} | Mes: {result.normalized.meta?.mes || "N/A"} |
            Carroceria: {result.normalized.meta?.carroceria || "N/A"}
          </p>
          {Array.isArray(result.normalized.routes) && result.normalized.routes.length > 0 ? (
            result.normalized.routes.map((route, i) => (
              <RouteCard
                key={`${route.id_sice || route.nombre}-${i}`}
                route={route}
                index={i}
                total={result.normalized.routes.length}
              />
            ))
          ) : (
            <p>No hay resultados para mostrar.</p>
          )}
          <details>
            <summary>Ver texto resumen</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{result.normalized.texto}</pre>
          </details>
          <details>
            <summary>Ver diagnóstico técnico</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(
                { diagnostics: result.diagnostics || null, raw: result.raw || null },
                null,
                2
              )}
            </pre>
          </details>
        </section>
      ) : null}

      <p style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
        Defaults: Cálculos con 2 Horas - 4 Horas y 8 Horas logìsticas, los parametros pueden cambiarse selecionando el vehículo y carroceria 
      </p>
      <footer
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid #e5e5e5",
          fontSize: 12,
          color: "#666",
          letterSpacing: 0.2,
        }}
      >
        Fuente: Modelo SICETAC.- Mintransporte Colombia - Desarrollado por Atiemppo - Febrero 2026
      </footer>
    </main>
  );
}
