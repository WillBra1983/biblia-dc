/**
 * Sincronização dos versículos marcados com o Realtime Database (mesmo usuário em vários dispositivos).
 *
 * Foi desligado temporariamente durante a campanha de performance da abertura
 * da Bíblia, para isolar causas de lentidão. As otimizações posteriores
 * (`UserCloudSync` agora monta só após `app-splash-fechado`, Firebase carrega
 * dinamicamente, `posSplash` defere o `subscribe` até a Bíblia pintar e há
 * filtro de eco do mesmo `clientId`) eliminam a contenção que motivou o
 * desligamento, então a flag volta a `true`.
 *
 * O merge entre dispositivos preserva exclusões (tombstones com timestamp em
 * `deletes`), evitando que um versículo apagado num aparelho reapareça pelo
 * outro — ver `mergeMarcadoresComExclusoes` em `versiculosMarcadosCloudSync`.
 */
export const VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED = true
