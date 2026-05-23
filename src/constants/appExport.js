/** Versão do JSON enviado no chat (incrementar quando o formato mudar). */
export const APP_EXPORT_SCHEMA_VERSION = 1

/**
 * O app só aplica o envio na conta local se `payload.schema <= APP_EXPORT_MAX_APPLY_SCHEMA_VERSION`.
 * Se `payload.schema` for maior, o usuário vê só a pré-visualização (leitura).
 */
export const APP_EXPORT_MAX_APPLY_SCHEMA_VERSION = 1
