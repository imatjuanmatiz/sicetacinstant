export const VEHICLE_OPTIONS = ["C278", "C289", "C2910", "C2M10", "C3", "C2S2", "C2S3", "C3S2", "C3S3", "V3"];

export const BODY_TYPE_OPTIONS = [
  "General - Estacas",
  "General - Furgon",
  "General - Estibas",
  "General - Plataforma",
  "Portacontenedores",
  "Furgon Refrigerado",
  "Granel Solido - Estacas",
  "Granel Solido - Furgon",
  "Granel Solido - Volco",
  "Granel Solido - Estibas",
  "Granel Solido - Plataforma",
  "Granel Liquido - Tanque",
];

export const BODY_TYPE_ALIASES = {
  GENERAL: "General - Estacas",
  "GENERAL ESTACAS": "General - Estacas",
  "GENERAL - ESTACAS": "General - Estacas",
  ESTIBA: "General - Estibas",
  ESTIBAS: "General - Estibas",
  "GENERAL ESTIBAS": "General - Estibas",
  "GENERAL - ESTIBAS": "General - Estibas",
  PLATAFORMA: "General - Plataforma",
  "GENERAL PLATAFORMA": "General - Plataforma",
  "GENERAL - PLATAFORMA": "General - Plataforma",
  "FURGON GENERAL": "General - Furgon",
  "GENERAL FURGON": "General - Furgon",
  "GENERAL - FURGON": "General - Furgon",
  PORTACONTENEDORES: "Portacontenedores",
  "PORTA CONTENEDORES": "Portacontenedores",
  "CONTENEDOR PORTACONTENEDORES": "Portacontenedores",
  "FURGON REFRIGERADO": "Furgon Refrigerado",
  "CARGA REFRIGERADA": "Furgon Refrigerado",
  REFRIGERADO: "Furgon Refrigerado",
  "ESTACAS GRANEL SOLIDO": "Granel Solido - Estacas",
  "GRANEL SOLIDO ESTACAS": "Granel Solido - Estacas",
  "GRANEL SOLIDO - ESTACAS": "Granel Solido - Estacas",
  "FURGON GRANEL SOLIDO": "Granel Solido - Furgon",
  "GRANEL SOLIDO FURGON": "Granel Solido - Furgon",
  "GRANEL SOLIDO - FURGON": "Granel Solido - Furgon",
  VOLCO: "Granel Solido - Volco",
  "GRANEL SOLIDO VOLCO": "Granel Solido - Volco",
  "GRANEL SOLIDO - VOLCO": "Granel Solido - Volco",
  "ESTIBAS GRANEL SOLIDO": "Granel Solido - Estibas",
  "GRANEL SOLIDO ESTIBAS": "Granel Solido - Estibas",
  "GRANEL SOLIDO - ESTIBAS": "Granel Solido - Estibas",
  "PLATAFORMA GRANEL SOLIDO": "Granel Solido - Plataforma",
  "GRANEL SOLIDO PLATAFORMA": "Granel Solido - Plataforma",
  "GRANEL SOLIDO - PLATAFORMA": "Granel Solido - Plataforma",
  "TANQUE - GRANEL LIQUIDO": "Granel Liquido - Tanque",
  "TANQUE GRANEL LIQUIDO": "Granel Liquido - Tanque",
  "GRANEL LIQUIDO TANQUE": "Granel Liquido - Tanque",
};

export function normalizeBodyType(value) {
  if (typeof value !== "string") return BODY_TYPE_OPTIONS[0];
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return BODY_TYPE_OPTIONS[0];
  const upper = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  return BODY_TYPE_ALIASES[upper] || cleaned;
}
