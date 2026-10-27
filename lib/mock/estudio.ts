import type { Contacto, Inmueble, Suministro, TipoSuministro } from "../types";
import { FOTOS } from "../photos";
import { mulberry32 } from "../format";

export const MARCA = { nombre: "Sam Delano", lema: "Asistente del estudio" };

export const PROYECTOS = ["Altair 38 m · velero", "Nereida 52 m · motor", "Bruma 28 m · refit", "Levante 62 m · concepto", "Administración", "Inmuebles"];

const rnd = mulberry32(2026);
const dig = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");
const letras = () => String.fromCharCode(65 + Math.floor(rnd() * 26)) + String.fromCharCode(65 + Math.floor(rnd() * 26));
/** CUPS de luz o gas: ES + distribuidora + 12 cifras + 2 letras de control (inventados) */
const cups = (distribuidora: string) => `ES${distribuidora}${dig(12)}${letras()}`;
const contrato = () => dig(3) + "-" + dig(7);

let n = 0;
const sum = (tipo: TipoSuministro, proveedor: string, extra: Partial<Suministro> = {}): Suministro => ({
  id: `sum-${++n}`,
  tipo,
  proveedor,
  contrato: contrato(),
  pdfAdjunto: true,
  ...extra,
});

export function crearInmuebles(): Inmueble[] {
  return [
    {
      id: "inm-01",
      codigo: "INM-01",
      nombre: "Velázquez 112, 4º A",
      direccion: "Calle de Velázquez, 112, 4º A",
      ciudad: "28006 Madrid",
      tipo: "Vivienda",
      foto: FOTOS.inmuebles[0],
      suministros: [
        sum("Luz", "Energía Meseta", { cups: cups("0021") }),
        sum("Gas", "Gasnor Hogar", { cups: cups("0230") }),
        sum("Agua", "Aguas Canal Norte"),
        sum("Teléfono e internet", "Fibra Plus", { pdfAdjunto: false }),
        sum("Comunidad", "Comunidad de propietarios Velázquez 112"),
      ],
    },
    {
      id: "inm-02",
      codigo: "INM-02",
      nombre: "Fernán González 18, 2º D",
      direccion: "Calle de Fernán González, 18, 2º D",
      ciudad: "28009 Madrid",
      tipo: "Vivienda",
      foto: FOTOS.inmuebles[1],
      suministros: [sum("Luz", "Volta Comercializadora", { cups: cups("0021") }), sum("Agua", "Aguas Canal Norte"), sum("Comunidad", "Comunidad de propietarios Fernán González 18")],
    },
    {
      id: "inm-03",
      codigo: "INM-03",
      nombre: "Ponzano 61, 1º B",
      direccion: "Calle de Ponzano, 61, 1º B",
      ciudad: "28003 Madrid",
      tipo: "Vivienda",
      foto: FOTOS.inmuebles[2],
      suministros: [
        sum("Luz", "Energía Meseta", { cups: cups("0021") }),
        sum("Gas", "Gasnor Hogar", { cups: cups("0230") }),
        sum("Agua", "Aguas Canal Norte"),
        sum("Teléfono e internet", "Onda Hogar", { pdfAdjunto: false }),
      ],
    },
    {
      id: "inm-04",
      codigo: "INM-04",
      nombre: "Paseo Marítimo 37, 5º C",
      direccion: "Paseo Marítimo, 37, 5º C",
      ciudad: "07014 Palma",
      tipo: "Vivienda",
      foto: FOTOS.inmuebles[3],
      suministros: [sum("Luz", "Lumen Balear", { cups: cups("0031") }), sum("Agua", "Aguas de la Bahía"), sum("Comunidad", "Comunidad Edificio Marítimo 37")],
    },
    {
      id: "inm-05",
      codigo: "INM-05",
      nombre: "Local Joan Miró 9",
      direccion: "Carrer de Joan Miró, 9, bajo",
      ciudad: "07015 Palma",
      tipo: "Local",
      foto: FOTOS.inmuebles[4],
      suministros: [sum("Luz", "Lumen Balear", { cups: cups("0031") }), sum("Agua", "Aguas de la Bahía"), sum("Teléfono e internet", "Fibra Plus", { pdfAdjunto: false })],
    },
    {
      id: "inm-06",
      codigo: "INM-06",
      nombre: "Avenida del Puerto 210, 2º A",
      direccion: "Avenida del Puerto, 210, 2º A",
      ciudad: "46023 Valencia",
      tipo: "Vivienda",
      foto: FOTOS.inmuebles[5],
      suministros: [sum("Luz", "Volta Comercializadora", { cups: cups("0021") }), sum("Gas", "Gasnor Hogar", { cups: cups("0234") }), sum("Agua", "Aguas Huerta Sur")],
    },
    {
      id: "inm-07",
      codigo: "INM-07",
      nombre: "Nave Campezo 14",
      direccion: "Calle de Campezo, 14, nave 3",
      ciudad: "28022 Madrid",
      tipo: "Nave",
      foto: FOTOS.inmuebles[6],
      suministros: [sum("Luz", "Energía Meseta", { cups: cups("0021") }), sum("Agua", "Aguas Canal Norte"), sum("Seguros", "Seguros Ancla")],
    },
    {
      id: "inm-08",
      codigo: "INM-08",
      nombre: "Garaje Ayala 74, plaza 12",
      direccion: "Calle de Ayala, 74, plaza 12",
      ciudad: "28001 Madrid",
      tipo: "Garaje",
      foto: FOTOS.inmuebles[7],
      suministros: [sum("Comunidad", "Comunidad de garajes Ayala 74"), sum("Impuestos", "Ayuntamiento de Madrid · IBI"), sum("Seguros", "Seguros Ancla")],
    },
  ];
}

export function crearContactos(): Contacto[] {
  const p = FOTOS.personas;
  return [
    { id: "c-1", nombre: "Lucía Ferrer", empresa: "Astillero Punta Brava", rol: "Jefa de obra", foto: p[0], idioma: "es" },
    { id: "c-2", nombre: "Tom Hargreaves", empresa: "Northwater Tank Lab", rol: "Ingeniero de ensayos", foto: p[1], idioma: "en" },
    { id: "c-3", nombre: "Marta Olivares", empresa: "Velería Tramontana", rol: "Velera", foto: p[2], idioma: "es" },
    { id: "c-4", nombre: "Javier Echeverría", empresa: "Gestoría Arrieta y Molina", rol: "Asesor fiscal", foto: p[3], idioma: "es" },
    { id: "c-5", nombre: "Giulia Conti", empresa: "Atelier Lumio Interiors", rol: "Interiorista", foto: p[4], idioma: "en" },
    { id: "c-6", nombre: "Pablo Sanz", empresa: "Seguros Ancla", rol: "Corredor", foto: p[5], idioma: "es" },
    { id: "c-7", nombre: "Andrea Campos", empresa: "Pinturas Marinas Azor", rol: "Técnica comercial", foto: p[6], idioma: "es" },
    { id: "c-8", nombre: "Daniel Ruiz", empresa: "Varadero Sotavento", rol: "Encargado", foto: p[7], idioma: "es" },
    { id: "c-9", nombre: "Sophie Laurent", empresa: "Atlantic Survey Office", rol: "Inspectora", foto: p[8], idioma: "en" },
    { id: "c-10", nombre: "Elena Navarro", empresa: "Fotografía Náutica Bruma", rol: "Fotógrafa", foto: p[9], idioma: "es" },
  ];
}
