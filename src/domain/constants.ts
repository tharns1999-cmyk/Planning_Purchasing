import { Room } from './types';

export const FIXED_ROOMS: readonly Room[] = [
  { id: 'R1', name: 'ห้องขนม 1', description: 'สายการผลิตขนมและเบเกอรี่ 1' },
  { id: 'R2', name: 'ห้องขนม 2', description: 'สายการผลิตขนมและเบเกอรี่ 2' },
  { id: 'R3', name: 'ห้องผลไม้', description: 'สายการผลิตและเตรียมผลไม้แปรรูป' },
  { id: 'R4', name: 'ห้องแพ็ค', description: 'สายการบรรจุและแพ็กสินค้า' },
] as const;
