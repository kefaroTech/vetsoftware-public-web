// Mock data — espejo de src/features/dashboard/data/mock.ts y otros.

const VET_MOCK_USER = {
  firstName: 'Mariana',
  lastName: 'Rojas',
  role: 'Veterinaria',
  clinic: 'Clínica Norte',
};

const VET_MOCK_DAY_STATS = {
  total: 8,
  inProgress: 1,
  pending: 5,
  completed: 2,
};

const VET_MOCK_RECENT = [
  {
    id: 'c1',
    patient: { name: 'Luna', species: 'Felino', ageYears: 4, ownerName: 'Carla Mendoza' },
    reason: 'Control vacunación',
    dayLabel: 'Hoy', timeLabel: '09:30',
    status: 'en_curso',
  },
  {
    id: 'c2',
    patient: { name: 'Rocco', species: 'Canino', ageYears: 7, ownerName: 'Luis Paredes' },
    reason: 'Cojera pata trasera',
    dayLabel: 'Hoy', timeLabel: '11:00',
    status: 'programada',
  },
  {
    id: 'c3',
    patient: { name: 'Mishi', species: 'Felino', ageYears: 2, ownerName: 'Andrea Solís' },
    reason: 'Esterilización post-op',
    dayLabel: 'Ayer', timeLabel: '16:20',
    status: 'completada',
  },
  {
    id: 'c4',
    patient: { name: 'Toby', species: 'Canino', ageYears: 11, ownerName: 'Jorge Vargas' },
    reason: 'Chequeo geriátrico',
    dayLabel: 'Ayer', timeLabel: '14:00',
    status: 'completada',
  },
];

// Permisos — espejo de src/constants/permissions.ts (asumimos admin para el prototipo)
const VET_PERMISSIONS_ALL = true;

Object.assign(window, {
  VET_MOCK_USER,
  VET_MOCK_DAY_STATS,
  VET_MOCK_RECENT,
  VET_PERMISSIONS_ALL,
});
