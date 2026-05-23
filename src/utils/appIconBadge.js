import { Capacitor } from '@capacitor/core'

let badgeModulePromise = null
let permissionChecked = false

async function getBadgePlugin() {
  if (Capacitor.getPlatform() === 'web') return null
  if (!badgeModulePromise) {
    badgeModulePromise = import('@capawesome/capacitor-badge')
      .then((mod) => mod?.Badge ?? null)
      .catch(() => null)
  }
  return badgeModulePromise
}

async function ensureBadgePermission(plugin) {
  if (permissionChecked || !plugin) return
  permissionChecked = true
  try {
    if (typeof plugin.checkPermissions !== 'function') return
    const status = await plugin.checkPermissions()
    if (
      status?.display === 'prompt' &&
      typeof plugin.requestPermissions === 'function'
    ) {
      await plugin.requestPermissions()
    }
  } catch {
    // Falha de permissão não deve quebrar o app.
  }
}

export async function setAppIconBadgeCount(rawCount) {
  const plugin = await getBadgePlugin()
  if (!plugin) return false
  await ensureBadgePermission(plugin)

  const count = Math.max(0, Math.min(999, Number(rawCount) || 0))
  try {
    if (count > 0 && typeof plugin.set === 'function') {
      await plugin.set({ count })
    } else if (typeof plugin.clear === 'function') {
      await plugin.clear()
    } else if (typeof plugin.set === 'function') {
      await plugin.set({ count: 0 })
    }
    return true
  } catch {
    return false
  }
}
