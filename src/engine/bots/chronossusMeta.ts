import type { BotModule } from './BotModule';

/** Registry descriptor for the Chronossus (logic lives in ./chronossus). */
export const chronossus: BotModule = {
  id: 'chronossus',
  name: 'Chronossus',
  description:
    'The advanced automa — a more human-like opponent with an Energy Pool, modular Action tiles, Autoleap, and Solo Objectives.',
  supportedExpansions: ['base'],
  // Shipped: base game + Hypersync module are live. More modes/options land over time.
  implemented: true,
};
