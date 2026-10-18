import type { Client, Project, Task, Material, Quote, User } from '../types';

// Usuarios de prueba para las pantallas que todavía los necesitan.
export const users: User[] = [];

export const clients: Client[] = [];

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

export const quotes: Quote[] = [];
