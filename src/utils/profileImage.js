/**
 * Redimensiona e comprime para JPEG (para avatar no Storage).
 * @param {File} file
 * @param {number} maxEdge lado máximo em px
 * @param {number} quality 0–1
 * @returns {Promise<Blob>}
 */
export function compressImageToJpeg(file, maxEdge = 512, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Escolha um arquivo de imagem.'))
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      const scale = Math.min(1, maxEdge / Math.max(width, height, 1))
      const w = Math.max(1, Math.round(width * scale))
      const h = Math.max(1, Math.round(height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas indisponível.'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error('Não foi possível gerar a imagem.'))
          else resolve(blob)
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }
    img.src = url
  })
}
