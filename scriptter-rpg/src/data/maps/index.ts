import type { MapDef } from '../types';
import { clearingMap } from './clearing';

/**
 * Registro de mapas. Para um novo episódio com mapa próprio (ex.: sala do
 * trono do Rei), crie um arquivo aqui e registre a chave no episode.json.
 */
export const MAPS: Record<string, MapDef> = {
  clearing: clearingMap,
};

export function getMap(id: string): MapDef {
  return MAPS[id] ?? clearingMap;
}
