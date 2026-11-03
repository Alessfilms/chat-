import { P } from '../assets/palette';
import type { CharacterStyle } from '../assets/characters';

export interface ProtagonistDef {
  id: 'A' | 'B';
  key: string;
  /** nome exibido na placa sobre o personagem */
  label: string;
  /** nome usado nas caixas de diálogo */
  speaker: string;
  energetic: boolean;
  style: CharacterStyle;
}

/**
 * PROTAGONISTA A — aventureiro: cabelo castanho bagunçado, cachecol vermelho,
 * túnica verde-musgo, cinto de couro. Idle mais "saltitante".
 *
 * PROTAGONISTA B — inventor/escritor: cabelo escuro alinhado, óculos, casaco
 * azul-noite com botão dourado, sempre com um livro.
 */
export const PROTAGONISTS: ProtagonistDef[] = [
  {
    id: 'A',
    key: 'hero-a',
    label: 'HISTORIADOR 001',
    speaker: 'HISTORIADOR 001',
    energetic: true,
    style: {
      skin: P.skin0, skinShade: P.skin0s,
      hair: '#6e4426', hairLight: '#9c6a3c', hairStyle: 'messy',
      shirt: '#4f7a4a', shirtShade: '#38583a',
      pants: '#3d3346', shoes: P.wood0,
      scarf: '#c8323a', scarfShade: '#8a1f2a',
      belt: P.wood1,
    },
  },
  {
    id: 'B',
    key: 'hero-b',
    label: 'HISTORIADOR 002',
    speaker: 'HISTORIADOR 002',
    energetic: false,
    style: {
      skin: P.skin1, skinShade: P.skin1s,
      hair: '#231c2e', hairLight: '#4a3d5e', hairStyle: 'neat',
      shirt: '#34507a', shirtShade: '#253a5a',
      pants: '#2a2a36', shoes: P.wood0,
      glasses: true, book: true, coat: true,
    },
  },
];

export function protagonist(id: string): ProtagonistDef | undefined {
  return PROTAGONISTS.find((p) => p.id === id || p.key === id);
}
