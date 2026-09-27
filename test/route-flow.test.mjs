import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { routeErrorMessage } from "../app/lib/route-errors.js";
import { BODY_TYPE_OPTIONS, VEHICLE_OPTIONS } from "../app/lib/sicetac-options.js";

const require = createRequire(process.env.INSTANT_DEPENDENCIES || new URL("../package.json", import.meta.url));
const babel = require("next/dist/compiled/babel/core");
const presetReact = require("next/dist/compiled/babel/preset-react");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const pageSource = readFileSync(new URL("../app/page.jsx", import.meta.url), "utf8");
const { code } = babel.transformSync(
  pageSource.replace(/^import .*;\r?\n/gm, "").replace("export default function Page", "function Page") + "\nthis.Page = Page;",
  { presets: [[presetReact, { runtime: "classic" }]], configFile: false, babelrc: false },
);

// Ejecuta los handlers reales del componente con estado controlado. No monta
// navegador ni consulta red; React real valida el renderizado de errores.
function ui() {
  const slots = []; let cursor = 0; const sent = [];
  const state = initial => {
    const slot = cursor++;
    if (!(slot in slots)) slots[slot] = initial;
    return [slots[slot], value => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }];
  };
  const ctx = vm.createContext({ React, Image: () => null, useState: state,
    useRef: initial => state({ current: initial })[0], routeErrorMessage, BODY_TYPE_OPTIONS, VEHICLE_OPTIONS,
    fetch: async (_url, options) => {
      sent.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ normalized: { selection_required: true, meta: {}, route_options: { ida: [{ id: "i", nombre: "Ida" }], regreso: [{ id: "r", nombre: "Regreso" }] }, routes: [] } }) };
    },
  });
  vm.runInContext(code, ctx);
  const render = () => { cursor = 0; return ctx.Page(); };
  function find(predicate, node = render()) {
    if (Array.isArray(node)) { for (const child of node) { const found = find(predicate, child); if (found) return found; } return null; }
    if (!node || typeof node !== "object") return null;
    return predicate(node) ? node : find(predicate, node.props?.children ?? null);
  }
  const byId = id => { const node = find(n => n.props?.id === id); assert(node, `Missing ${id}`); return node; };
  const change = (id, value) => byId(id).props.onChange({ target: { value } });
  const body = value => { const node = find(n => n.type === "button" && n.props.children === value); assert(node); node.props.onClick(); };
  const submit = () => find(n => n.type === "form").props.onSubmit({ preventDefault() {} });
  return { change, body, submit, sent, ctx, find, byId };
}
async function selectedRoundTrip() {
  const page = ui(); page.change("origen", "Cartagena"); page.change("destino", "Cúcuta");
  page.body("Portacontenedores"); page.change("tipo-recorrido", "REDONDO");
  await page.submit(); page.change("ruta-ida", "i"); page.change("ruta-regreso", "r");
  return page;
}

for (const [field, value] of [["origen", "Bogotá"], ["destino", "Medellín"], ["vehiculo", "C2S2"], ["modo-viaje", "VACIO"], ["tipo-contenedor", "VACIO"], ["tipo-recorrido", "SENCILLO"]]) {
  test(`cambiar ${field} invalida rutas y resultado anteriores`, async () => {
    const page = await selectedRoundTrip(); page.change(field, value);
    assert.equal(page.find(n => n.props?.id === "ruta-ida"), null);
    await page.submit(); const sent = page.sent.at(-1);
    assert.equal(sent.rutasid_ida, null); assert.equal(sent.rutasid_regreso, null);
  });
}
test("cambiar carrocería descarta retorno y selección anterior", async () => {
  const page = await selectedRoundTrip(); page.body("General - Estacas"); await page.submit();
  assert.equal(page.sent.at(-1).viaje_redondo, false); assert.equal(page.sent.at(-1).rutasid_ida, null);
});
test("conservar el recorrido permite enviar las variantes elegidas", async () => {
  const page = await selectedRoundTrip(); await page.submit();
  assert.equal(page.sent.at(-1).rutasid_ida, "i"); assert.equal(page.sent.at(-1).rutasid_regreso, "r");
});
test("ida vacía desactiva redondo; elegir redondo exige ida cargada", async () => {
  const page = await selectedRoundTrip(); page.change("tipo-contenedor", "VACIO"); await page.submit();
  assert.equal(page.sent.at(-1).viaje_redondo, false); assert.equal(page.sent.at(-1).modo_viaje, "CARGADO");
  assert.equal(page.sent.at(-1).tipo_contenedor, "VACIO");
  page.change("tipo-recorrido", "REDONDO"); await page.submit();
  assert.equal(page.sent.at(-1).tipo_contenedor, "CARGADO");
  assert.equal(page.sent.at(-1).tipo_contenedor_regreso, "VACIO");
});
test("la respuesta tardía de un recorrido invalidado no reaparece", async () => {
  const page = ui(); let complete;
  page.ctx.fetch = () => new Promise(resolve => { complete = resolve; });
  const pending = page.submit(); page.change("origen", "Nuevo origen");
  complete({ ok: false, json: async () => ({ error: "Error de la ruta anterior" }) });
  await pending;
  assert.equal(page.find(n => n.props?.className === "error-box"), null);
});
test("errores de validación del backend se muestran como texto renderizable", async () => {
  const page = ui(); page.ctx.fetch = async () => ({ ok: false, json: async () => ({ detail: [{ msg: "Origen inválido" }, { msg: "Destino inválido" }] }) });
  await page.submit(); const box = page.find(n => n.props?.className === "error-box");
  assert.match(renderToStaticMarkup(box), /Origen inválido · Destino inválido/);
  assert.equal(routeErrorMessage({ detail: {} }), "No fue posible consultar la ruta.");
  assert.equal(routeErrorMessage({ error: "Sin tarifa" }), "Sin tarifa");
});

function proxy() {
  const requests = [];
  const source = readFileSync(new URL("../app/api/route/route.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replace("export async function POST", "async function POST");
  const opts = readFileSync(new URL("../app/lib/sicetac-options.js", import.meta.url), "utf8").replace(/\bexport /g, "");
  const ctx = vm.createContext({ URL, Request, Response, AbortSignal, process: { env: {} }, fetch: async (url, options) => {
    requests.push({ url, payload: JSON.parse(options.body) });
    return Response.json({ origen: "Cartagena", destino: "Nueva Colonia", totales: { H4: 10 } });
  } });
  vm.runInContext(opts + "\n" + source, ctx);
  return { requests, post: payload => ctx.POST(new Request("https://example.invalid/api/route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })) };
}
const request = { origen: "Cartagena", destino: "Puerto Antioquia", vehiculo: "C3S3", carroceria: "Portacontenedores", modo_viaje: "CARGADO", tipo_contenedor: "CARGADO", viaje_redondo: true, tipo_contenedor_regreso: "VACIO" };
test("proxy rechaza ida vacía en redondo antes de consultar el backend", async () => {
  const p = proxy(); const result = await p.post({ ...request, tipo_contenedor: "VACIO" });
  assert.equal(result.status, 400); assert.equal(p.requests.length, 0);
});
test("proxy conserva Puerto Antioquia para el helper compartido por /consulta", async () => {
  const p = proxy(); const result = await p.post(request);
  assert.equal(result.status, 200); assert.equal(p.requests[0].payload.destino, "Puerto Antioquia");
  assert.equal(p.requests[0].url, "https://sicetac-api-mcp.onrender.com/consulta");
  assert.equal(p.requests[0].payload.modo_viaje, "CARGADO");
  assert.equal(p.requests[0].payload.tipo_contenedor_regreso, "VACIO");
});

const detailData = {
  origen: "Cartagena", destino: "Nueva Colonia", configuracion: "C3S3", carroceria: "General - Estacas",
  total_km: 500, mes: 202609,
  sicetac_tradicional: { total_viaje: 1234567, horas_logisticas: 4, mes: 202609 },
  detalle_costos: { total_viaje: 9876543, total_galones: 30, combustible: 300000,
    horas_recorrido: 10, horas_logisticas: 4, rotaciones_calculadas: 15,
    costo_fijo: 300000, costos_variables: 400000, peajes: 80000, mantenimiento: 20000,
    imprevistos: 10000, otros_costos: 10000, costo_fijo_mensual: 4500000, mes_costo_fijo: 202609 },
  detalle_consumo: { por_terreno: { plano: { km: 500, gal: 30, costo_combustible: 300000 } } },
};
async function singleResult() {
  const page = ui();
  const context = { origen: "Cartagena", destino: "Nueva Colonia", vehiculo: "C3S3", carroceria: "General - Estacas", modo_viaje: "CARGADO" };
  const result = { normalized: { meta: { mes: 202609 }, routes: [{ id_sice: "ruta-42", nombre: "Ruta vigente", total_km: 500 }] }, diagnostics: { request_payload: context } };
  page.ctx.fetch = async () => ({ ok: true, json: async () => result });
  await page.submit();
  return { page, result, context };
}
const detailNode = page => page.find(n => n.type?.name === "ModelDetail");
const requestDetail = (page, tipo = "costos") => {
  const card = page.find(n => n.type?.name === "RouteCard");
  assert(card?.props.onDetail);
  return card.props.onDetail(card.props.route, tipo);
};
for (const tipo of ["costos", "consumo"]) {
  test(`detalle de ${tipo} conserva contexto, distancia y un único total SICETAC`, async () => {
    const { page, context } = await singleResult(); let sent;
    const card = page.find(n => n.type?.name === "RouteCard");
    const cardHtml = renderToStaticMarkup(card);
    assert.match(cardHtml, /500 km/); assert.match(cardHtml, /Detalle de costos/); assert.match(cardHtml, /Detalle de consumo/);
    page.ctx.fetch = async (_url, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({ raw: detailData }) }; };
    await requestDetail(page, tipo);
    assert.deepEqual(sent, { ...context, rutasid: "ruta-42", mes: 202609, resumen: false, peajes: false, horas_logisticas: 4, detalle_costos: tipo === "costos", detalle_consumo: tipo === "consumo" });
    const html = renderToStaticMarkup(detailNode(page));
    assert.equal((html.match(/Total SICETAC/g) || []).length, 1);
    assert.match(html, /1\.234\.567/); assert.doesNotMatch(html, /9\.876\.543|Total modelo/);
    page.change("destino", "Otro destino");
    assert.equal(detailNode(page), null);
  });
}
test("detalle tardío no se adjunta al resultado de una ruta nueva", async () => {
  const { page, result } = await singleResult(); let complete;
  page.ctx.fetch = () => new Promise(resolve => { complete = resolve; });
  const pending = requestDetail(page);
  page.change("origen", "Bogotá");
  page.ctx.fetch = async () => ({ ok: true, json: async () => result });
  await page.submit();
  complete({ ok: true, json: async () => ({ raw: detailData }) });
  await pending;
  assert.equal(detailNode(page), null); assert.equal(page.find(n => n.props?.role === "status"), null);
});
test("fallo de detalle anterior no cancela la carga ni agrega errores a uno nuevo", async () => {
  const { page } = await singleResult(); let fail, complete;
  page.ctx.fetch = () => new Promise((_resolve, reject) => { fail = reject; });
  const old = requestDetail(page);
  page.ctx.fetch = () => new Promise(resolve => { complete = resolve; });
  const current = requestDetail(page, "consumo");
  fail(new Error("Error anterior")); await old;
  assert(page.find(n => n.props?.role === "status")); assert.equal(page.find(n => n.props?.role === "alert"), null);
  complete({ ok: true, json: async () => ({ raw: detailData }) }); await current;
  assert.equal(detailNode(page).props.detail.tipo, "consumo");
});
test("error estructurado del detalle se muestra como texto", async () => {
  const { page } = await singleResult();
  page.ctx.fetch = async () => ({ ok: false, json: async () => ({ detail: [{ msg: "Ruta sin detalle" }] }) });
  await requestDetail(page);
  assert.match(renderToStaticMarkup(page.find(n => n.props?.role === "alert")), /Ruta sin detalle/);
});
