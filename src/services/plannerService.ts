import { GasRepository } from './repositories/GasRepository';

// Automatically uses Google Apps Script if 'google' is available, otherwise falls back to LocalStorage.
export const plannerRepository = new GasRepository();
