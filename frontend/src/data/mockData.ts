import type { Client, Project, Task, Material, Quote, User } from '../types';

export const currentUser: User = {
  id: 'u1',
  name: 'Valeria Ortega',
  email: 'valeria@cosplaycrafthub.com',
  role: 'admin',
  active: true,
};

export const users: User[] = [
  currentUser,
  { id: 'u2', name: 'Tomás Ríos', email: 'tomas@cosplaycrafthub.com', role: 'maker', active: true },
  { id: 'u3', name: 'Camila Fuentes', email: 'camila@cosplaycrafthub.com', role: 'maker', active: true },
  { id: 'u4', name: 'Diego Paredes', email: 'diego@cosplaycrafthub.com', role: 'viewer', active: false },
];

export const clients: Client[] = [
  { id: 'c1', name: 'Sofía Reyes', email: 'sofia@email.com', phone: '+52 55 1234-5678', city: 'CDMX', projects: 4, totalSpent: 18500, status: 'active', joinedAt: '2023-03-10', notes: 'Coleccionista VIP. Prefiere comunicación por WhatsApp.' },
  { id: 'c2', name: 'Marco Delgado', email: 'marco.d@email.com', phone: '+52 33 9876-5432', city: 'Guadalajara', projects: 6, totalSpent: 31200, status: 'active', joinedAt: '2022-11-05' },
  { id: 'c3', name: 'Elena Vásquez', email: 'elena.v@email.com', phone: '+52 81 5555-4444', city: 'Monterrey', projects: 2, totalSpent: 9800, status: 'active', joinedAt: '2024-01-20' },
  { id: 'c4', name: 'Diego Morales', email: 'diegom@email.com', phone: '+52 55 2222-3333', city: 'CDMX', projects: 1, totalSpent: 4500, status: 'active', joinedAt: '2024-06-15' },
  { id: 'c5', name: 'Ana Castillo', email: 'ana.c@email.com', phone: '+52 55 7777-8888', city: 'Puebla', projects: 5, totalSpent: 22000, status: 'active', joinedAt: '2023-08-01' },
  { id: 'c6', name: 'Rodrigo Salinas', email: 'rodrigo.s@email.com', phone: '+52 33 4444-9999', city: 'Guadalajara', projects: 3, totalSpent: 13600, status: 'inactive', joinedAt: '2023-01-15' },
  { id: 'c7', name: 'Lucía Herrera', email: 'lucia.h@email.com', phone: '+52 81 1111-2222', city: 'Monterrey', projects: 2, totalSpent: 7400, status: 'active', joinedAt: '2024-04-03' },
  { id: 'c8', name: 'Andrés Navarro', email: 'andres.n@email.com', phone: '+52 55 3333-6666', city: 'CDMX', projects: 7, totalSpent: 41000, status: 'active', joinedAt: '2022-07-22' },
];

export const projects: Project[] = [
  { id: 'p1', name: 'Arthas Menethil – Lich King', clientId: 'c2', clientName: 'Marco Delgado', description: 'Armadura completa del Rey Exánime de World of Warcraft con casco y espada Gélida. EVA foam, worbla y efectos LED.', responsible: 'Valeria Ortega', status: 'in_progress', priority: 'urgent', startDate: '2025-09-01', dueDate: '2025-10-15', progress: 62, budget: 8500, spent: 5100, tags: ['WoW', 'armor', 'LED'] },
  { id: 'p2', name: 'Nezuko Kamado – Kimetsu', clientId: 'c1', clientName: 'Sofía Reyes', description: 'Kimono completo con patrón de hemp-leaf, cesta de bambú y maquillaje de demonio.', responsible: 'Camila Fuentes', status: 'completed', priority: 'medium', startDate: '2025-07-10', dueDate: '2025-08-30', progress: 100, budget: 3200, spent: 3050, tags: ['anime', 'kimono'] },
  { id: 'p3', name: 'Luffy Gear 5 – One Piece', clientId: 'c5', clientName: 'Ana Castillo', description: 'Traje blanco de Gear 5 con peluca afro blanca, efectos de nube y accesorios.', responsible: 'Tomás Ríos', status: 'in_progress', priority: 'high', startDate: '2025-09-15', dueDate: '2025-11-01', progress: 35, budget: 4200, spent: 1400, tags: ['anime', 'One Piece'] },
  { id: 'p4', name: 'Yae Miko – Genshin Impact', clientId: 'c7', clientName: 'Lucía Herrera', description: 'Kimono de zorra kitsune con orejas y cola articuladas, detalle en oro y morado.', responsible: 'Valeria Ortega', status: 'planning', priority: 'low', startDate: '2025-10-20', dueDate: '2025-12-10', progress: 10, budget: 5600, spent: 0, tags: ['Genshin', 'kimono'] },
  { id: 'p5', name: 'Geralt de Rivia – The Witcher', clientId: 'c8', clientName: 'Andrés Navarro', description: 'Armadura de Witcher con medallón, espadas plateadas y cicatrices de maquillaje FX.', responsible: 'Tomás Ríos', status: 'review', priority: 'medium', startDate: '2025-08-01', dueDate: '2025-09-30', progress: 90, budget: 6800, spent: 6200, tags: ['game', 'armor'] },
  { id: 'p6', name: '2B – NieR:Automata', clientId: 'c3', clientName: 'Elena Vásquez', description: 'Vestido negro con venda ocular, peluca corta blanca y espadas YoRHa gemelas.', responsible: 'Camila Fuentes', status: 'planning', priority: 'high', startDate: '2025-11-01', dueDate: '2026-01-15', progress: 5, budget: 7200, spent: 0, tags: ['game', 'dress'] },
  { id: 'p7', name: 'Vergil – Devil May Cry 5', clientId: 'c8', clientName: 'Andrés Navarro', description: 'Abrigo azul largo con katana Yamato, guantes blancos y efectos especiales plateados.', responsible: 'Tomás Ríos', status: 'completed', priority: 'medium', startDate: '2025-05-20', dueDate: '2025-07-15', progress: 100, budget: 5500, spent: 5300, tags: ['game', 'coat'] },
  { id: 'p8', name: 'Makima – Chainsaw Man', clientId: 'c1', clientName: 'Sofía Reyes', description: 'Traje de oficina con detalles de cuerdas, peluca roja y lentes de control mental.', responsible: 'Valeria Ortega', status: 'in_progress', priority: 'high', startDate: '2025-09-10', dueDate: '2025-10-31', progress: 48, budget: 3800, spent: 1800, tags: ['anime', 'office'] },
];

export const tasks: Task[] = [
  { id: 't1', projectId: 'p1', title: 'Diseñar patrón de armadura pectoral', status: 'done', priority: 'high', assignee: 'Valeria Ortega' },
  { id: 't2', projectId: 'p1', title: 'Cortar piezas de EVA foam 5mm', status: 'done', priority: 'high', assignee: 'Tomás Ríos' },
  { id: 't3', projectId: 'p1', title: 'Termo-moldear casco del Lich King', status: 'in_progress', priority: 'urgent', assignee: 'Valeria Ortega', dueDate: '2025-10-01' },
  { id: 't4', projectId: 'p1', title: 'Instalar tiras LED en casco', status: 'in_progress', priority: 'high', assignee: 'Tomás Ríos', dueDate: '2025-10-05' },
  { id: 't5', projectId: 'p1', title: 'Pintura base y capas de detalle', status: 'todo', priority: 'medium', assignee: 'Camila Fuentes', dueDate: '2025-10-08' },
  { id: 't6', projectId: 'p1', title: 'Fabricar Gélida (espada) en worbla', status: 'review', priority: 'high', assignee: 'Valeria Ortega', dueDate: '2025-09-28' },
  { id: 't7', projectId: 'p1', title: 'Ajuste final y prueba de cliente', status: 'todo', priority: 'medium', assignee: 'Valeria Ortega', dueDate: '2025-10-13' },
  { id: 't8', projectId: 'p3', title: 'Conseguir tela stretch blanca premium', status: 'done', priority: 'high', assignee: 'Tomás Ríos' },
  { id: 't9', projectId: 'p3', title: 'Hacer patrón de pantalones bombachos', status: 'in_progress', priority: 'medium', assignee: 'Tomás Ríos', dueDate: '2025-09-30' },
  { id: 't10', projectId: 'p3', title: 'Fabricar peluca afro blanca', status: 'todo', priority: 'medium', dueDate: '2025-10-15' },
];

export const materials: Material[] = [
  { id: 'm1', name: 'EVA Foam 2mm', category: 'Estructura', quantity: 15, unit: 'plancha', unitCost: 85, minStock: 5, stock: 'ok', supplier: 'FoamMex', location: 'Estante A-1' },
  { id: 'm2', name: 'EVA Foam 5mm', category: 'Estructura', quantity: 3, unit: 'plancha', unitCost: 120, minStock: 5, stock: 'low', supplier: 'FoamMex', location: 'Estante A-1' },
  { id: 'm3', name: 'Worbla Thermoplastic', category: 'Estructura', quantity: 2, unit: 'm²', unitCost: 850, minStock: 3, stock: 'critical', supplier: 'CraftWorld', location: 'Estante A-2' },
  { id: 'm4', name: 'Tela Cotton Premium Blanca', category: 'Tela', quantity: 20, unit: 'm', unitCost: 95, minStock: 8, stock: 'ok', supplier: 'Textiles García', location: 'Estante B-1' },
  { id: 'm5', name: 'Tela Satín Negro', category: 'Tela', quantity: 12, unit: 'm', unitCost: 140, minStock: 5, stock: 'ok', supplier: 'Textiles García', location: 'Estante B-2' },
  { id: 'm6', name: 'Tela Velvet Morado', category: 'Tela', quantity: 0, unit: 'm', unitCost: 180, minStock: 3, stock: 'out', supplier: 'Textiles García', location: 'Estante B-3' },
  { id: 'm7', name: 'Pintura Acrílica Dorada', category: 'Pintura', quantity: 6, unit: 'frasco 250ml', unitCost: 65, minStock: 3, stock: 'ok', supplier: 'ArteMex', location: 'Estante C-1' },
  { id: 'm8', name: 'Spray Plateado Metálico', category: 'Pintura', quantity: 2, unit: 'lata 400ml', unitCost: 120, minStock: 4, stock: 'critical', supplier: 'ArteMex', location: 'Estante C-2' },
  { id: 'm9', name: 'Tiras LED RGB 5V', category: 'Electrónica', quantity: 10, unit: 'm', unitCost: 75, minStock: 5, stock: 'ok', supplier: 'ElectroParts', location: 'Cajón D-1' },
  { id: 'm10', name: 'Controlador LED Bluetooth', category: 'Electrónica', quantity: 4, unit: 'pieza', unitCost: 220, minStock: 2, stock: 'ok', supplier: 'ElectroParts', location: 'Cajón D-1' },
  { id: 'm11', name: 'Hilo de Costura Negro', category: 'Costura', quantity: 8, unit: 'carrete 500m', unitCost: 35, minStock: 4, stock: 'ok', supplier: 'CosaMax', location: 'Estante E-1' },
  { id: 'm12', name: 'Pegamento de Contacto', category: 'Adhesivos', quantity: 5, unit: 'tubo 100ml', unitCost: 55, minStock: 6, stock: 'low', supplier: 'CosaMax', location: 'Estante E-2' },
  { id: 'm13', name: 'Resina UV Transparente', category: 'Estructura', quantity: 1, unit: 'frasco 500g', unitCost: 450, minStock: 2, stock: 'critical', supplier: 'CraftWorld', location: 'Estante A-3' },
  { id: 'm14', name: 'Peluca Blanca Larga', category: 'Accesorios', quantity: 3, unit: 'pieza', unitCost: 280, minStock: 1, stock: 'ok', supplier: 'WigWorld', location: 'Caja F-1' },
  { id: 'm15', name: 'Hebillas y Remaches', category: 'Accesorios', quantity: 48, unit: 'pieza', unitCost: 8, minStock: 20, stock: 'ok', supplier: 'HardwareMex', location: 'Cajón G-1' },
];

export const quotes: Quote[] = [
  {
    id: 'q1', number: 'CCH-2025-042', clientId: 'c2', clientName: 'Marco Delgado', projectId: 'p1', projectName: 'Arthas Menethil – Lich King',
    status: 'approved', discount: 5, tax: 16, notes: 'Incluye envío a Guadalajara.',
    createdAt: '2025-08-28', validUntil: '2025-09-28',
    items: [
      { id: 'qi1', description: 'Armadura EVA Foam + Worbla (torso, brazos, piernas)', quantity: 1, unitPrice: 4500, type: 'material' },
      { id: 'qi2', description: 'Casco Lich King con detalle en resina UV', quantity: 1, unitPrice: 2200, type: 'material' },
      { id: 'qi3', description: 'Espada Gélida en worbla pintada', quantity: 1, unitPrice: 1800, type: 'material' },
      { id: 'qi4', description: 'Instalación de sistema LED', quantity: 1, unitPrice: 600, type: 'labor' },
      { id: 'qi5', description: 'Mano de obra total (80 hrs)', quantity: 80, unitPrice: 85, type: 'labor' },
    ],
  },
  {
    id: 'q2', number: 'CCH-2025-038', clientId: 'c1', clientName: 'Sofía Reyes', projectId: 'p2', projectName: 'Nezuko Kamado – Kimetsu',
    status: 'invoiced', discount: 0, tax: 16, notes: '',
    createdAt: '2025-07-05', validUntil: '2025-08-05',
    items: [
      { id: 'qi6', description: 'Kimono con patrón hemp-leaf bordado', quantity: 1, unitPrice: 1800, type: 'material' },
      { id: 'qi7', description: 'Cesta de bambú prop', quantity: 1, unitPrice: 450, type: 'material' },
      { id: 'qi8', description: 'Mano de obra confección (35 hrs)', quantity: 35, unitPrice: 80, type: 'labor' },
    ],
  },
  {
    id: 'q3', number: 'CCH-2025-045', clientId: 'c5', clientName: 'Ana Castillo', projectId: 'p3', projectName: 'Luffy Gear 5 – One Piece',
    status: 'sent', discount: 10, tax: 16, notes: 'Descuento por cliente frecuente.',
    createdAt: '2025-09-12', validUntil: '2025-10-12',
    items: [
      { id: 'qi9', description: 'Traje stretch blanco completo', quantity: 1, unitPrice: 1600, type: 'material' },
      { id: 'qi10', description: 'Peluca afro blanca personalizada', quantity: 1, unitPrice: 560, type: 'material' },
      { id: 'qi11', description: 'Props: sombrero y efectos de nube', quantity: 1, unitPrice: 380, type: 'material' },
      { id: 'qi12', description: 'Mano de obra (45 hrs)', quantity: 45, unitPrice: 80, type: 'labor' },
    ],
  },
  {
    id: 'q4', number: 'CCH-2025-047', clientId: 'c7', clientName: 'Lucía Herrera', projectId: 'p4', projectName: 'Yae Miko – Genshin Impact',
    status: 'draft', discount: 0, tax: 16, notes: 'Pendiente confirmar detalles de orejas articuladas.',
    createdAt: '2025-09-20', validUntil: '2025-10-20',
    items: [
      { id: 'qi13', description: 'Kimono seda sintética morado/dorado', quantity: 1, unitPrice: 2800, type: 'material' },
      { id: 'qi14', description: 'Orejas de zorro articuladas', quantity: 1, unitPrice: 650, type: 'material' },
      { id: 'qi15', description: 'Cola de zorro 9 puntas', quantity: 1, unitPrice: 1200, type: 'material' },
      { id: 'qi16', description: 'Mano de obra (60 hrs)', quantity: 60, unitPrice: 85, type: 'labor' },
    ],
  },
  {
    id: 'q5', number: 'CCH-2025-039', clientId: 'c8', clientName: 'Andrés Navarro', projectId: 'p5', projectName: 'Geralt de Rivia – The Witcher',
    status: 'approved', discount: 0, tax: 16, notes: '',
    createdAt: '2025-07-28', validUntil: '2025-08-28',
    items: [
      { id: 'qi17', description: 'Armadura de cuero sintético completa', quantity: 1, unitPrice: 3200, type: 'material' },
      { id: 'qi18', description: 'Par de espadas: acero y plata', quantity: 2, unitPrice: 1100, type: 'material' },
      { id: 'qi19', description: 'Medallón de lobo en resina UV', quantity: 1, unitPrice: 350, type: 'material' },
      { id: 'qi20', description: 'Mano de obra (70 hrs)', quantity: 70, unitPrice: 85, type: 'labor' },
    ],
  },
  {
    id: 'q6', number: 'CCH-2025-043', clientId: 'c1', clientName: 'Sofía Reyes', projectId: 'p8', projectName: 'Makima – Chainsaw Man',
    status: 'sent', discount: 5, tax: 16, notes: 'Descuento por ser segunda solicitud del mes.',
    createdAt: '2025-09-08', validUntil: '2025-10-08',
    items: [
      { id: 'qi21', description: 'Traje de oficina personalizado', quantity: 1, unitPrice: 1400, type: 'material' },
      { id: 'qi22', description: 'Arnés de cuerdas prop', quantity: 1, unitPrice: 600, type: 'material' },
      { id: 'qi23', description: 'Lentes de control (efecto pupila)', quantity: 1, unitPrice: 280, type: 'material' },
      { id: 'qi24', description: 'Mano de obra (40 hrs)', quantity: 40, unitPrice: 80, type: 'labor' },
    ],
  },
];
