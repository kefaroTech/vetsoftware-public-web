// Iconos compartidos — todos hechos a mano simples (Lucide-style 1.5px stroke)
const Icon = ({ children, size = 18, stroke = 1.5, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={stroke}
       strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

const IconConsulta = (p) => (
  <Icon {...p}>
    <path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h4"/>
    <rect x="5" y="3" width="14" height="18" rx="2"/>
  </Icon>
);
// Stethoscope-ish but generic
const IconPaciente = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3"/>
    <path d="M5.5 21c.5-3.5 3-6 6.5-6s6 2.5 6.5 6"/>
  </Icon>
);
const IconAgenda = (p) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2"/>
    <path d="M3 9h18"/><path d="M8 3v4"/><path d="M16 3v4"/>
  </Icon>
);
const IconInventario = (p) => (
  <Icon {...p}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5z"/>
    <path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>
  </Icon>
);
const IconFacturacion = (p) => (
  <Icon {...p}>
    <path d="M4 4h16v16l-3-2-3 2-3-2-3 2-4-2z"/>
    <path d="M8 9h8"/><path d="M8 13h5"/>
  </Icon>
);
const IconReportes = (p) => (
  <Icon {...p}>
    <path d="M3 21h18"/><rect x="5" y="11" width="3" height="8"/>
    <rect x="10.5" y="7" width="3" height="12"/><rect x="16" y="14" width="3" height="5"/>
  </Icon>
);
const IconAjustes = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
  </Icon>
);
const IconSearch = (p) => (
  <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>
);
const IconChevronDown = (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>;
const IconChevronRight = (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>;
const IconPlus = (p) => <Icon {...p}><path d="M12 5v14"/><path d="M5 12h14"/></Icon>;
const IconArrowRight = (p) => <Icon {...p}><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></Icon>;
const IconBell = (p) => (
  <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>
);
const IconCommand = (p) => (
  <Icon {...p}><path d="M9 6V4a2 2 0 1 0-2 2h2zm0 0v12m0 0v2a2 2 0 1 1-2-2h2zm6-12V4a2 2 0 1 1 2 2h-2zm0 0v12m0 0v2a2 2 0 1 0 2-2h-2zm-6 0h6m0-12H9"/></Icon>
);
const IconHistorial = (p) => (
  <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/></Icon>
);
const IconNueva = (p) => (
  <Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M12 12v6"/><path d="M9 15h6"/></Icon>
);
const IconVacuna = (p) => (
  <Icon {...p}><path d="M14 4l6 6"/><path d="M9 9l6 6"/><path d="M3 21l6-6"/><path d="M11 7l6 6"/></Icon>
);
const IconPaw = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="10" r="2"/><circle cx="10" cy="6" r="2"/>
    <circle cx="14" cy="6" r="2"/><circle cx="18" cy="10" r="2"/>
    <path d="M8 16c0-2 2-4 4-4s4 2 4 4-1 4-4 4-4-2-4-4z"/>
  </Icon>
);

Object.assign(window, {
  Icon, IconConsulta, IconPaciente, IconAgenda, IconInventario, IconFacturacion,
  IconReportes, IconAjustes, IconSearch, IconChevronDown, IconChevronRight,
  IconPlus, IconArrowRight, IconBell, IconCommand, IconHistorial, IconNueva,
  IconVacuna, IconPaw,
});
