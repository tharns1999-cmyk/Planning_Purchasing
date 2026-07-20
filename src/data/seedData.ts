import { FIXED_ROOMS } from '../domain/constants';
import { Priority, SourceType, SalesOrder, SalesOrderLine, WipPrepItem, CustomerMaster, ProductMaster } from '../domain/types';

import { DatabaseEntities, DatabaseSchema, CURRENT_SCHEMA_VERSION } from '../services/databaseSchema';

const SEED_TIMESTAMP = '2026-07-20T00:00:00.000Z';

export const SEED_ROOMS = [...FIXED_ROOMS];

export const SEED_SALES_ORDER_LINES: SalesOrderLine[] = [
  // Order 1 (so-1001): บริษัท อิ่มอร่อย พลาซ่า จำกัด
  {
    id: 'sol-1001-1',
    orderId: 'so-1001',
    skuCode: 'SKU-BAK-001',
    skuName: 'พายไก่ไข่เค็ม 120g',
    orderedQty: 500,
    cancelledQty: 0,
    unit: 'ชิ้น',
    dueDate: '2026-07-22',
    priority: Priority.URGENT,
    notes: 'ส่งมอบรอบเช้าพิเศษ',
  },
  {
    id: 'sol-1001-2',
    orderId: 'so-1001',
    skuCode: 'SKU-BAK-002',
    skuName: 'ขนมปังเนยสด 200g',
    orderedQty: 800,
    cancelledQty: 0,
    unit: 'ชิ้น',
    dueDate: '2026-07-23',
    priority: Priority.NORMAL,
  },

  // Order 2 (so-1002): ห้างสรรพสินค้า เซ็นทรัลฟู้ดฮอลล์
  {
    id: 'sol-1002-1',
    orderId: 'so-1002',
    skuCode: 'SKU-FRT-001',
    skuName: 'มะม่วงอบแห้งพรีเมียม 150g',
    orderedQty: 1200,
    cancelledQty: 0,
    unit: 'ถุง',
    dueDate: '2026-07-24',
    priority: Priority.NORMAL,
  },
  {
    id: 'sol-1002-2',
    orderId: 'so-1002',
    skuCode: 'SKU-FRT-002',
    skuName: 'สับปะรดอบแห้งแว่น 200g',
    orderedQty: 600,
    cancelledQty: 0,
    unit: 'ถุง',
    dueDate: '2026-07-25',
    priority: Priority.NORMAL,
  },

  // Order 3 (so-1003): ร้านสะดวกซื้อ เฟรชไบท์
  {
    id: 'sol-1003-1',
    orderId: 'so-1003',
    skuCode: 'SKU-BAK-003',
    skuName: 'เค้กฝอยทอง 350g',
    orderedQty: 400,
    cancelledQty: 0,
    unit: 'กล่อง',
    dueDate: '2026-07-21',
    priority: Priority.URGENT,
    notes: 'ด่วนมาก สินค้าขาดสต็อกหน้าร้าน',
  },
  {
    id: 'sol-1003-2',
    orderId: 'so-1003',
    skuCode: 'SKU-FRT-003',
    skuName: 'กล้วยหอมอบกรอบ 100g',
    orderedQty: 1000,
    cancelledQty: 0,
    unit: 'ซอง',
    dueDate: '2026-07-24',
    priority: Priority.NORMAL,
  },
];

export const SEED_SALES_ORDERS: SalesOrder[] = [
  {
    id: 'so-1001',
    orderNo: 'PO-2026-001',
    customerName: 'บริษัท อิ่มอร่อย พลาซ่า จำกัด',
    orderDate: '2026-07-18',
    lines: SEED_SALES_ORDER_LINES.filter((l) => l.orderId === 'so-1001'),
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'so-1002',
    orderNo: 'PO-2026-002',
    customerName: 'ห้างสรรพสินค้า เซ็นทรัลฟู้ดฮอลล์',
    orderDate: '2026-07-19',
    lines: SEED_SALES_ORDER_LINES.filter((l) => l.orderId === 'so-1002'),
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: 'so-1003',
    orderNo: 'PO-2026-003',
    customerName: 'ร้านสะดวกซื้อ เฟรชไบท์',
    orderDate: '2026-07-19',
    lines: SEED_SALES_ORDER_LINES.filter((l) => l.orderId === 'so-1003'),
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export const SEED_WIP_PREP_ITEMS: WipPrepItem[] = [
  {
    itemId: 'wip-01',
    itemType: SourceType.WIP,
    itemCode: 'WIP-CHICKEN-PREP',
    itemName: 'ไก่ผัดไส้พายหมักเครื่องเทศ (WIP)',
    defaultUnit: 'กก.',
    relatedProduct: 'SKU-BAK-001',
    note: 'ต้องเตรียมพักไส้ 2 ชั่วโมงก่อนห่อ',
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    itemId: 'wip-02',
    itemType: SourceType.WIP,
    itemCode: 'WIP-DOUGH-BASE',
    itemName: 'แป้งพายชั้นหมักเนยสด (WIP)',
    defaultUnit: 'กก.',
    relatedProduct: 'SKU-BAK-001',
    note: 'เก็บบรรจุในห้องเย็นควบคุมอุณหภูมิ',
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    itemId: 'prep-01',
    itemType: SourceType.PREP,
    itemCode: 'PREP-MANGO-SLICE',
    itemName: 'มะม่วงหั่นชิ้นเตรียมอบ (PREP)',
    defaultUnit: 'กก.',
    relatedProduct: 'SKU-FRT-001',
    note: 'แช่น้ำเชื่อมความเข้มข้น 15 Brix',
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    itemId: 'prep-02',
    itemType: SourceType.PREP,
    itemCode: 'PREP-BANANA-CHIP',
    itemName: 'กล้วยสไลซ์เตรียมทอดกรอบ (PREP)',
    defaultUnit: 'กก.',
    relatedProduct: 'SKU-FRT-003',
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export const SEED_CUSTOMERS: CustomerMaster[] = [
  {
    customerId: 'cust-001',
    customerCode: 'CUST-001',
    customerName: 'บริษัท อิ่มอร่อย พลาซ่า จำกัด',
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    customerId: 'cust-002',
    customerCode: 'CUST-002',
    customerName: 'ห้างสรรพสินค้า เซ็นทรัลฟู้ดฮอลล์',
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    customerId: 'cust-003',
    customerCode: 'CUST-003',
    customerName: 'ร้านสะดวกซื้อ เฟรชไบท์',
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    customerId: 'cust-004',
    customerCode: 'CUST-004',
    customerName: 'บจก. สยามแม็คโคร ฟู้ดเซ็นเตอร์',
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    customerId: 'cust-005',
    customerCode: 'CUST-005',
    customerName: 'บมจ. บิ๊กซี ซูเปอร์เซ็นเตอร์',
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];

export const SEED_PRODUCTS: ProductMaster[] = [
  {
    productId: 'prod-001',
    productCode: 'PROD-BAK-001',
    productName: 'พายไก่ไข่เค็ม 120g',
    defaultUnit: 'ชิ้น',
    customerId: 'cust-001', // บริษัท อิ่มอร่อย พลาซ่า จำกัด
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    productId: 'prod-002',
    productCode: 'PROD-BAK-002',
    productName: 'ขนมปังเนยสด 200g',
    defaultUnit: 'ชิ้น',
    customerId: 'cust-001', // บริษัท อิ่มอร่อย พลาซ่า จำกัด
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    productId: 'prod-003',
    productCode: 'PROD-BAK-003',
    productName: 'เค้กฝอยทอง 350g',
    defaultUnit: 'กล่อง',
    customerId: 'cust-003', // ร้านสะดวกซื้อ เฟรชไบท์
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    productId: 'prod-004',
    productCode: 'PROD-FRT-001',
    productName: 'มะม่วงอบแห้งพรีเมียม 150g',
    defaultUnit: 'ถุง',
    customerId: 'cust-002', // ห้างสรรพสินค้า เซ็นทรัลฟู้ดฮอลล์
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    productId: 'prod-005',
    productCode: 'PROD-FRT-002',
    productName: 'สับปะรดอบแห้งแว่น 200g',
    defaultUnit: 'ถุง',
    customerId: 'cust-002', // ห้างสรรพสินค้า เซ็นทรัลฟู้ดฮอลล์
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    productId: 'prod-006',
    productCode: 'PROD-FRT-003',
    productName: 'กล้วยหอมอบกรอบ 100g',
    defaultUnit: 'ซอง',
    customerId: 'cust-003', // ร้านสะดวกซื้อ เฟรชไบท์
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    productId: 'prod-007',
    productCode: 'PROD-BAK-004',
    productName: 'ขนมปังโฮลวีต 400g',
    defaultUnit: 'แถว',
    customerId: 'cust-001', // บริษัท อิ่มอร่อย พลาซ่า จำกัด
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    productId: 'prod-008',
    productCode: 'PROD-CKI-001',
    productName: 'คุกกี้เนยอัลมอนด์ 180g',
    defaultUnit: 'กระปุก',
    customerId: 'cust-002', // ห้างสรรพสินค้า เซ็นทรัลฟู้ดฮอลล์
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    productId: 'prod-009',
    productCode: 'PROD-TRT-001',
    productName: 'ทาร์ตผลไม้สด 150g',
    defaultUnit: 'ชิ้น',
    customerId: 'cust-004', // บจก. สยามแม็คโคร ฟู้ดเซ็นเตอร์
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    productId: 'prod-010',
    productCode: 'PROD-BRN-001',
    productName: 'บราวนี่ช็อกโกแลตเข้มข้น 80g',
    defaultUnit: 'ชิ้น',
    customerId: 'cust-003', // ร้านสะดวกซื้อ เฟรชไบท์
    active: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];


export const INITIAL_SEED_ENTITIES: DatabaseEntities = {
  rooms: SEED_ROOMS,
  salesOrders: SEED_SALES_ORDERS,
  salesOrderLines: SEED_SALES_ORDER_LINES,
  wipPrepItems: SEED_WIP_PREP_ITEMS,
  weeklyPlans: [],
  planAllocations: [],
  productionActualEntries: [],
  boardNotes: [],
  customers: SEED_CUSTOMERS,
  products: SEED_PRODUCTS,
};

export const INITIAL_SEED_DATABASE: DatabaseSchema = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  initializedAt: SEED_TIMESTAMP,
  updatedAt: SEED_TIMESTAMP,
  entities: INITIAL_SEED_ENTITIES,
};

