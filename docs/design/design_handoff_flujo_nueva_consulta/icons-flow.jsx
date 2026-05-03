// Iconos extra para el flujo de Nueva Consulta
const IconArrowLeft = (p) => <Icon {...p}><path d="M19 12H5"/><path d="M11 19l-7-7 7-7"/></Icon>;
const IconCheck = (p) => <Icon {...p}><path d="M20 6L9 17l-5-5"/></Icon>;
const IconX = (p) => <Icon {...p}><path d="M18 6L6 18"/><path d="M6 6l12 12"/></Icon>;
const IconUser = (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></Icon>;
const IconPhone = (p) => <Icon {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></Icon>;
const IconMail = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></Icon>;
const IconId = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4"/><path d="M7 13h2"/><path d="M14 9h3"/><path d="M14 13h3"/></Icon>;
const IconMapPin = (p) => <Icon {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></Icon>;
const IconCalendar = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4"/><path d="M16 3v4"/></Icon>;
const IconScale = (p) => <Icon {...p}><path d="M12 3v18"/><path d="M5 21h14"/><path d="M5 9l7-6 7 6"/><path d="M3 13a3 3 0 0 0 4 0L5 9z"/><path d="M17 13a3 3 0 0 0 4 0L19 9z"/></Icon>;
const IconAlert = (p) => <Icon {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></Icon>;
const IconEdit = (p) => <Icon {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></Icon>;
const IconCheckCircle = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></Icon>;
const IconStethoscope = (p) => <Icon {...p}><path d="M5 3v6a4 4 0 0 0 8 0V3"/><path d="M9 13v3a4 4 0 0 0 8 0v-2"/><circle cx="17" cy="9" r="2"/></Icon>;
const IconPill = (p) => <Icon {...p}><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="M8.5 8.5l7 7"/></Icon>;
const IconFlask = (p) => <Icon {...p}><path d="M9 3h6"/><path d="M10 3v7L4 20a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-10V3"/></Icon>;
const IconScan = (p) => <Icon {...p}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M21 7V5a2 2 0 0 0-2-2h-2"/><path d="M3 17v2a2 2 0 0 0 2 2h2"/><path d="M21 17v2a2 2 0 0 0-2 2h-2"/><path d="M7 12h10"/></Icon>;
const IconSparkles = (p) => <Icon {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></Icon>;
const IconTrash = (p) => <Icon {...p}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></Icon>;

Object.assign(window, {
  IconArrowLeft, IconCheck, IconX, IconUser, IconPhone, IconMail, IconId,
  IconMapPin, IconCalendar, IconScale, IconAlert, IconEdit, IconCheckCircle,
  IconStethoscope, IconPill, IconFlask, IconScan, IconSparkles, IconTrash,
});
