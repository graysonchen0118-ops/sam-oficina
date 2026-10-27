// Fotos reales de Unsplash, elegidas para un estudio de diseño de yates en Madrid
// y sus inmuebles en Madrid, Palma y Valencia.
const u = (id: string, w: number, h: number, extra = "") => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=80${extra}`;

const IDS = {
  inmuebles: [
    "photo-1671682915351-ea647be31939",
    "photo-1658922185367-88ced54b6561",
    "photo-1743432025864-6fe38295ec3b",
    "photo-1779917748196-5341917bad2e",
    "photo-1641159930908-e9eb9ccdc002",
    "photo-1731611538184-ba4a4726ea0f",
    "photo-1551313158-73d016a829ae",
    "photo-1548343361-02248be15911",
  ],
  personas: [
    "photo-1607990283143-e81e7a2c9349",
    "photo-1733348137468-90b917d2ebf1",
    "photo-1714976693236-6d4783342e94",
    "photo-1764084052707-f0d560ad67cf",
    "photo-1781888681811-332968760c2a",
    "photo-1705645930353-0e335311ef20",
    "photo-1685760259914-ee8d2c92d2e0",
    "photo-1764084051438-369ad6a09334",
    "photo-1714974528915-4c74c4c0bb27",
    "photo-1764173039123-044be68abf35",
  ],
  velero: "photo-1777456404471-619ccaa5ded6",
  plano: "photo-1766431098696-b2469c9ff337",
  marina: "photo-1699309207660-d6aa251d21ac",
  astillero: "photo-1757065824283-64bafec2ea1c",
  papeles: "photo-1771758249853-415175dc29b9",
  cubierta: "photo-1789943416860-48626db541c5",
};

export const FOTOS = {
  inmuebles: IDS.inmuebles.map((id) => u(id, 760, 520)),
  personas: IDS.personas.map((id) => u(id, 120, 120, "&crop=faces")),
  velero: u(IDS.velero, 1400, 900),
  plano: u(IDS.plano, 900, 640),
  marina: u(IDS.marina, 900, 640),
  // recortada: sin el recorte se ve la marca de la grúa y el nombre de otro barco
  astillero: `https://images.unsplash.com/${IDS.astillero}?rect=900,1300,4500,3000&w=900&h=640&fit=crop&q=80`,
  papeles: u(IDS.papeles, 900, 640),
  cubierta: u(IDS.cubierta, 900, 640),
};
