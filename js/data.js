// ============================================================
// COPA DEL MUNDO 2026 - DATOS DE LA FASE DE GRUPOS
// Banderas via flagcdn.com (imágenes reales, funciona en Windows)
// ============================================================

// Helper para generar el HTML de la bandera como imagen
function flag(code) {
  return `<img class="flag-img" src="https://flagcdn.com/24x18/${code.toLowerCase()}.png" alt="${code}" loading="lazy">`;
}

const GROUPS_DATA = {
  A: {
    name: "Grupo A",
    teams: ["México", "Sudáfrica", "Corea del Sur", "República Checa"],
    flags: {
      "México":          flag("mx"),
      "Sudáfrica":       flag("za"),
      "Corea del Sur":   flag("kr"),
      "República Checa": flag("cz")
    }
  },
  B: {
    name: "Grupo B",
    teams: ["Canadá", "Bosnia-Herzegovina", "Qatar", "Suiza"],
    flags: {
      "Canadá":              flag("ca"),
      "Bosnia-Herzegovina":  flag("ba"),
      "Qatar":               flag("qa"),
      "Suiza":               flag("ch")
    }
  },
  C: {
    name: "Grupo C",
    teams: ["Brasil", "Marruecos", "Haití", "Escocia"],
    flags: {
      "Brasil":    flag("br"),
      "Marruecos": flag("ma"),
      "Haití":     flag("ht"),
      "Escocia":   flag("gb-sct")
    }
  },
  D: {
    name: "Grupo D",
    teams: ["Estados Unidos", "Paraguay", "Australia", "Turquía"],
    flags: {
      "Estados Unidos": flag("us"),
      "Paraguay":       flag("py"),
      "Australia":      flag("au"),
      "Turquía":        flag("tr")
    }
  },
  E: {
    name: "Grupo E",
    teams: ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"],
    flags: {
      "Alemania":       flag("de"),
      "Curazao":        flag("cw"),
      "Costa de Marfil":flag("ci"),
      "Ecuador":        flag("ec")
    }
  },
  F: {
    name: "Grupo F",
    teams: ["Países Bajos", "Japón", "Suecia", "Túnez"],
    flags: {
      "Países Bajos": flag("nl"),
      "Japón":        flag("jp"),
      "Suecia":       flag("se"),
      "Túnez":        flag("tn")
    }
  },
  G: {
    name: "Grupo G",
    teams: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
    flags: {
      "Bélgica":       flag("be"),
      "Egipto":        flag("eg"),
      "Irán":          flag("ir"),
      "Nueva Zelanda": flag("nz")
    }
  },
  H: {
    name: "Grupo H",
    teams: ["España", "Cabo Verde", "Arabia Saudita", "Uruguay"],
    flags: {
      "España":         flag("es"),
      "Cabo Verde":     flag("cv"),
      "Arabia Saudita": flag("sa"),
      "Uruguay":        flag("uy")
    }
  },
  I: {
    name: "Grupo I",
    teams: ["Francia", "Senegal", "Irak", "Noruega"],
    flags: {
      "Francia": flag("fr"),
      "Senegal": flag("sn"),
      "Irak":    flag("iq"),
      "Noruega": flag("no")
    }
  },
  J: {
    name: "Grupo J",
    teams: ["Argentina", "Argelia", "Austria", "Jordania"],
    flags: {
      "Argentina": flag("ar"),
      "Argelia":   flag("dz"),
      "Austria":   flag("at"),
      "Jordania":  flag("jo")
    }
  },
  K: {
    name: "Grupo K",
    teams: ["Portugal", "RD Congo", "Uzbekistán", "Colombia"],
    flags: {
      "Portugal":   flag("pt"),
      "RD Congo":   flag("cd"),
      "Uzbekistán": flag("uz"),
      "Colombia":   flag("co")
    }
  },
  L: {
    name: "Grupo L",
    teams: ["Inglaterra", "Croacia", "Ghana", "Panamá"],
    flags: {
      "Inglaterra": flag("gb-eng"),
      "Croacia":    flag("hr"),
      "Ghana":      flag("gh"),
      "Panamá":     flag("pa")
    }
  }
};

// Partidos de la fase de grupos (6 por grupo = 72 total)
const INITIAL_MATCHES = [
  // GRUPO A
  { id: "A1", group: "A", home: "México",        away: "Sudáfrica",       date: "2026-06-11", time: "15:00" },
  { id: "A2", group: "A", home: "Corea del Sur", away: "República Checa", date: "2026-06-11", time: "18:00" },
  { id: "A3", group: "A", home: "México",        away: "Corea del Sur",   date: "2026-06-15", time: "15:00" },
  { id: "A4", group: "A", home: "Sudáfrica",     away: "República Checa", date: "2026-06-15", time: "18:00" },
  { id: "A5", group: "A", home: "México",        away: "República Checa", date: "2026-06-19", time: "18:00" },
  { id: "A6", group: "A", home: "Sudáfrica",     away: "Corea del Sur",   date: "2026-06-19", time: "18:00" },

  // GRUPO B
  { id: "B1", group: "B", home: "Canadá",             away: "Bosnia-Herzegovina", date: "2026-06-12", time: "15:00" },
  { id: "B2", group: "B", home: "Qatar",               away: "Suiza",              date: "2026-06-12", time: "18:00" },
  { id: "B3", group: "B", home: "Canadá",             away: "Qatar",              date: "2026-06-16", time: "15:00" },
  { id: "B4", group: "B", home: "Bosnia-Herzegovina", away: "Suiza",              date: "2026-06-16", time: "18:00" },
  { id: "B5", group: "B", home: "Canadá",             away: "Suiza",              date: "2026-06-20", time: "18:00" },
  { id: "B6", group: "B", home: "Bosnia-Herzegovina", away: "Qatar",              date: "2026-06-20", time: "18:00" },

  // GRUPO C
  { id: "C1", group: "C", home: "Brasil",    away: "Marruecos", date: "2026-06-12", time: "21:00" },
  { id: "C2", group: "C", home: "Haití",     away: "Escocia",   date: "2026-06-13", time: "15:00" },
  { id: "C3", group: "C", home: "Brasil",    away: "Haití",     date: "2026-06-16", time: "21:00" },
  { id: "C4", group: "C", home: "Marruecos", away: "Escocia",   date: "2026-06-17", time: "15:00" },
  { id: "C5", group: "C", home: "Brasil",    away: "Escocia",   date: "2026-06-21", time: "18:00" },
  { id: "C6", group: "C", home: "Marruecos", away: "Haití",     date: "2026-06-21", time: "18:00" },

  // GRUPO D
  { id: "D1", group: "D", home: "Estados Unidos", away: "Paraguay",  date: "2026-06-13", time: "18:00" },
  { id: "D2", group: "D", home: "Australia",      away: "Turquía",   date: "2026-06-13", time: "21:00" },
  { id: "D3", group: "D", home: "Estados Unidos", away: "Australia", date: "2026-06-17", time: "18:00" },
  { id: "D4", group: "D", home: "Paraguay",       away: "Turquía",   date: "2026-06-17", time: "21:00" },
  { id: "D5", group: "D", home: "Estados Unidos", away: "Turquía",   date: "2026-06-21", time: "22:00" },
  { id: "D6", group: "D", home: "Paraguay",       away: "Australia", date: "2026-06-21", time: "22:00" },

  // GRUPO E
  { id: "E1", group: "E", home: "Alemania",       away: "Curazao",         date: "2026-06-14", time: "12:00" },
  { id: "E2", group: "E", home: "Costa de Marfil",away: "Ecuador",         date: "2026-06-14", time: "15:00" },
  { id: "E3", group: "E", home: "Alemania",       away: "Costa de Marfil", date: "2026-06-18", time: "15:00" },
  { id: "E4", group: "E", home: "Curazao",        away: "Ecuador",         date: "2026-06-18", time: "18:00" },
  { id: "E5", group: "E", home: "Alemania",       away: "Ecuador",         date: "2026-06-22", time: "18:00" },
  { id: "E6", group: "E", home: "Curazao",        away: "Costa de Marfil", date: "2026-06-22", time: "18:00" },

  // GRUPO F
  { id: "F1", group: "F", home: "Países Bajos", away: "Japón",  date: "2026-06-14", time: "18:00" },
  { id: "F2", group: "F", home: "Suecia",       away: "Túnez",  date: "2026-06-14", time: "21:00" },
  { id: "F3", group: "F", home: "Países Bajos", away: "Suecia", date: "2026-06-18", time: "21:00" },
  { id: "F4", group: "F", home: "Japón",        away: "Túnez",  date: "2026-06-19", time: "12:00" },
  { id: "F5", group: "F", home: "Países Bajos", away: "Túnez",  date: "2026-06-22", time: "22:00" },
  { id: "F6", group: "F", home: "Suecia",       away: "Japón",  date: "2026-06-22", time: "22:00" },

  // GRUPO G
  { id: "G1", group: "G", home: "Bélgica", away: "Egipto",        date: "2026-06-15", time: "12:00" },
  { id: "G2", group: "G", home: "Irán",    away: "Nueva Zelanda", date: "2026-06-15", time: "15:00" },
  { id: "G3", group: "G", home: "Bélgica", away: "Irán",          date: "2026-06-19", time: "15:00" },
  { id: "G4", group: "G", home: "Egipto",  away: "Nueva Zelanda", date: "2026-06-19", time: "21:00" },
  { id: "G5", group: "G", home: "Bélgica", away: "Nueva Zelanda", date: "2026-06-23", time: "18:00" },
  { id: "G6", group: "G", home: "Irán",    away: "Egipto",        date: "2026-06-23", time: "18:00" },

  // GRUPO H
  { id: "H1", group: "H", home: "España",         away: "Cabo Verde",     date: "2026-06-15", time: "18:00" },
  { id: "H2", group: "H", home: "Arabia Saudita", away: "Uruguay",        date: "2026-06-15", time: "21:00" },
  { id: "H3", group: "H", home: "España",         away: "Arabia Saudita", date: "2026-06-19", time: "18:00" },
  { id: "H4", group: "H", home: "Cabo Verde",     away: "Uruguay",        date: "2026-06-20", time: "12:00" },
  { id: "H5", group: "H", home: "España",         away: "Uruguay",        date: "2026-06-23", time: "22:00" },
  { id: "H6", group: "H", home: "Cabo Verde",     away: "Arabia Saudita", date: "2026-06-23", time: "22:00" },

  // GRUPO I
  { id: "I1", group: "I", home: "Francia", away: "Senegal", date: "2026-06-16", time: "12:00" },
  { id: "I2", group: "I", home: "Irak",    away: "Noruega", date: "2026-06-16", time: "15:00" },
  { id: "I3", group: "I", home: "Francia", away: "Irak",    date: "2026-06-20", time: "15:00" },
  { id: "I4", group: "I", home: "Senegal", away: "Noruega", date: "2026-06-20", time: "18:00" },
  { id: "I5", group: "I", home: "Francia", away: "Noruega", date: "2026-06-24", time: "18:00" },
  { id: "I6", group: "I", home: "Irak",    away: "Senegal", date: "2026-06-24", time: "18:00" },

  // GRUPO J
  { id: "J1", group: "J", home: "Argentina", away: "Argelia",  date: "2026-06-16", time: "21:00" },
  { id: "J2", group: "J", home: "Austria",   away: "Jordania", date: "2026-06-17", time: "12:00" },
  { id: "J3", group: "J", home: "Argentina", away: "Austria",  date: "2026-06-20", time: "21:00" },
  { id: "J4", group: "J", home: "Argelia",   away: "Jordania", date: "2026-06-21", time: "12:00" },
  { id: "J5", group: "J", home: "Argentina", away: "Jordania", date: "2026-06-24", time: "22:00" },
  { id: "J6", group: "J", home: "Argelia",   away: "Austria",  date: "2026-06-24", time: "22:00" },

  // GRUPO K
  { id: "K1", group: "K", home: "Portugal",   away: "RD Congo",   date: "2026-06-17", time: "15:00" },
  { id: "K2", group: "K", home: "Uzbekistán", away: "Colombia",   date: "2026-06-17", time: "18:00" },
  { id: "K3", group: "K", home: "Portugal",   away: "Uzbekistán", date: "2026-06-21", time: "15:00" },
  { id: "K4", group: "K", home: "RD Congo",   away: "Colombia",   date: "2026-06-21", time: "18:00" },
  { id: "K5", group: "K", home: "Portugal",   away: "Colombia",   date: "2026-06-25", time: "18:00" },
  { id: "K6", group: "K", home: "RD Congo",   away: "Uzbekistán", date: "2026-06-25", time: "18:00" },

  // GRUPO L
  { id: "L1", group: "L", home: "Inglaterra", away: "Croacia", date: "2026-06-18", time: "12:00" },
  { id: "L2", group: "L", home: "Ghana",      away: "Panamá",  date: "2026-06-18", time: "15:00" },
  { id: "L3", group: "L", home: "Inglaterra", away: "Ghana",   date: "2026-06-22", time: "12:00" },
  { id: "L4", group: "L", home: "Croacia",    away: "Panamá",  date: "2026-06-22", time: "15:00" },
  { id: "L5", group: "L", home: "Inglaterra", away: "Panamá",  date: "2026-06-26", time: "18:00" },
  { id: "L6", group: "L", home: "Ghana",      away: "Croacia", date: "2026-06-26", time: "18:00" },
];
