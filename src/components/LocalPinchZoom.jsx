import GlobalPinchZoom from './GlobalPinchZoom'

/** Áreas locais compartilham a configuração da seção, sem multiplicador adicional. */
export default function LocalPinchZoom({ children, sx = {} }) {
  return <GlobalPinchZoom sx={sx}>{children}</GlobalPinchZoom>
}
