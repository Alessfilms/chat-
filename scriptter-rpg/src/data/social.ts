import { URL_PARAMS } from '../config';

/**
 * Configuração da ponte com redes sociais.
 *
 *   ?live=1                 liga o polling da API
 *   ?api=https://.../x.json  endpoint que devolve { "historianCount": 1234, ... }
 *   ?poll=15                intervalo do polling em segundos
 *   ?count=742              força uma contagem (útil para gravar vídeos)
 */
export const SOCIAL = {
  apiUrl: URL_PARAMS.get('api') ?? 'api/social.json',
  live: URL_PARAMS.get('live') === '1' || URL_PARAMS.has('api'),
  pollSeconds: Math.max(5, Number(URL_PARAMS.get('poll') ?? 20)),
  forcedCount: URL_PARAMS.has('count') ? Number(URL_PARAMS.get('count')) : undefined,
  /** acima disso as chegadas são agrupadas numa única notificação */
  toastBatchWindowMs: 2200,
};
