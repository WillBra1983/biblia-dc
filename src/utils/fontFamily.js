export const FONT_OPTIONS = [
  { value: 'system', label: 'Padrão' },
  { value: 'serif', label: 'Serifada' },
  { value: 'mono', label: 'Monoespaçada' },
  { value: 'alt', label: 'Alternativa' },
  { value: 'arial', label: 'Arial' },
  { value: 'times', label: 'Times New Roman' },
  { value: 'trebuchet', label: 'Trebuchet MS' },
  { value: 'tahoma', label: 'Tahoma' },
  { value: 'comic', label: 'Comic Sans' },
  { value: 'cursive', label: 'Cursiva' }
]

export function resolveFontFamily(fontFamily) {
  switch (fontFamily) {
    case 'serif':
      return '"Lora", Georgia, "Times New Roman", serif'
    case 'mono':
      return '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    case 'alt':
      return '"Open Sans", Arial, sans-serif'
    case 'arial':
      return 'Arial, Helvetica, sans-serif'
    case 'verdana':
      return 'Verdana, Geneva, sans-serif'
    case 'times':
      return '"Times New Roman", Times, serif'
    case 'georgia':
      return 'Georgia, serif'
    case 'trebuchet':
      return '"Lato", "Trebuchet MS", sans-serif'
    case 'tahoma':
      return '"Montserrat", Tahoma, Geneva, sans-serif'
    case 'comic':
      return '"Comic Neue", "Comic Sans MS", cursive'
    case 'cursive':
      return '"Dancing Script", "Brush Script MT", "Segoe Script", cursive'
    case 'system':
    default:
      return '"Roboto", system-ui, -apple-system, "Segoe UI", Arial, sans-serif'
  }
}

