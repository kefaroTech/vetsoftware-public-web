// Datos de ejemplo + catálogo de roles para Empleados
// Modelo (Vue/TS): { id, fullName, document, email, phone, hireDate, roles: RoleId[], active, avatar?, lastLogin? }

const ROLES = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso total al sistema, configuración y reportes.',
    permissions: [
      'Gestionar empleados y roles',
      'Configurar la clínica',
      'Ver todos los reportes financieros',
      'Acceso completo a historiales',
      'Gestionar inventario y precios',
    ],
    color: 'amatista',
  },
  {
    id: 'vet',
    name: 'Veterinario/a',
    description: 'Atención clínica · puede crear consultas, recetas y diagnósticos.',
    permissions: [
      'Crear y editar consultas',
      'Acceso a historial clínico',
      'Emitir recetas y solicitudes',
      'Programar cirugías y hospitalización',
      'Ver agenda propia',
    ],
    color: 'green',
  },
  {
    id: 'assistant',
    name: 'Asistente veterinario',
    description: 'Apoyo clínico · vacunas, curaciones y desparasitación.',
    permissions: [
      'Registrar vacunaciones y desparasitaciones',
      'Acceso a historial clínico (lectura)',
      'Crear consultas básicas',
      'Gestionar agenda',
    ],
    color: 'blue',
  },
  {
    id: 'reception',
    name: 'Recepcionista',
    description: 'Atención al público · agendamiento y facturación básica.',
    permissions: [
      'Crear propietarios y mascotas',
      'Gestionar agenda',
      'Emitir comprobantes',
      'Acceso a historial (solo lectura)',
    ],
    color: 'amber',
  },
  {
    id: 'aux',
    name: 'Auxiliar',
    description: 'Apoyo operativo · limpieza, inventario y soporte general.',
    permissions: [
      'Registrar movimientos de inventario',
      'Tareas operativas',
    ],
    color: 'gray',
  },
];

const SPECIALTIES = ['Medicina general', 'Cirugía', 'Dermatología', 'Cardiología', 'Oncología', 'Reproducción', 'Exóticos', 'Felinos'];

const EMPLOYEES = [
  {
    id: 1, fullName: 'Mariana Soto Quispe', document: 'DNI 41.829.301',
    email: 'mariana.soto@vetrina.com', phone: '+51 987 654 321',
    role: 'vet', specialty: 'Medicina general', hireDate: '2022-03-15',
    active: true, lastLogin: 'hace 12 min', initials: 'MS', roles: ['vet'],
  },
  {
    id: 2, fullName: 'Carlos Bustamante Reyes', document: 'DNI 38.451.220',
    email: 'carlos.bustamante@vetrina.com', phone: '+51 962 311 089',
    role: 'admin', hireDate: '2020-06-01',
    active: true, lastLogin: 'hace 2 h', initials: 'CB', roles: ['admin', 'vet'],
  },
  {
    id: 3, fullName: 'Lucía Fernández Vega', document: 'DNI 45.123.876',
    email: 'lucia.fernandez@vetrina.com', phone: '+51 951 220 887',
    role: 'vet', specialty: 'Cirugía', hireDate: '2023-08-22',
    active: true, lastLogin: 'hace 35 min', initials: 'LF', roles: ['vet'],
  },
  {
    id: 4, fullName: 'Andrés Paredes Quintero', document: 'DNI 49.110.554',
    email: 'andres.paredes@vetrina.com', phone: '+51 988 401 220',
    role: 'assistant', hireDate: '2024-01-10',
    active: true, lastLogin: 'hace 4 h', initials: 'AP', roles: ['assistant', 'reception'],
  },
  {
    id: 5, fullName: 'Patricia Ramos Linares', document: 'DNI 42.776.118',
    email: 'patricia.ramos@vetrina.com', phone: '+51 942 099 113',
    role: 'reception', hireDate: '2021-11-04',
    active: true, lastLogin: 'hace 8 min', initials: 'PR', roles: ['reception'],
  },
  {
    id: 6, fullName: 'Diego Salinas Cortez', document: 'DNI 47.331.082',
    email: 'diego.salinas@vetrina.com', phone: '+51 977 555 410',
    role: 'aux', hireDate: '2023-04-18',
    active: false, lastLogin: 'hace 23 días', initials: 'DS', roles: ['aux'],
  },
  {
    id: 7, fullName: 'Valeria Cordero Méndez', document: 'DNI 44.502.991',
    email: 'valeria.cordero@vetrina.com', phone: '+51 933 800 277',
    role: 'vet', specialty: 'Dermatología', hireDate: '2022-09-30',
    active: true, lastLogin: 'hace 1 día', initials: 'VC', roles: ['vet', 'admin'],
  },
  {
    id: 8, fullName: 'Renato Aguilar Bravo', document: 'DNI 40.117.443',
    email: 'renato.aguilar@vetrina.com', phone: '+51 966 712 005',
    role: 'assistant', hireDate: '2023-02-14',
    active: true, lastLogin: 'hace 27 min', initials: 'RA', roles: ['assistant', 'aux'],
  },
  {
    id: 9, fullName: 'Camila Otárola Pizarro', document: 'DNI 46.992.760',
    email: 'camila.otarola@vetrina.com', phone: '+51 920 311 458',
    role: 'reception', hireDate: '2024-05-06',
    active: true, lastLogin: 'hace 50 min', initials: 'CO', roles: ['reception'],
  },
  {
    id: 10, fullName: 'Tomás Ibáñez Cavero', document: 'DNI 39.220.811',
    email: 'tomas.ibanez@vetrina.com', phone: '+51 911 224 008',
    role: 'vet', specialty: 'Cardiología', hireDate: '2019-10-12',
    active: false, lastLogin: 'hace 2 meses', initials: 'TI', roles: ['vet', 'assistant', 'reception'],
  },
];

Object.assign(window, { ROLES, SPECIALTIES, EMPLOYEES });
