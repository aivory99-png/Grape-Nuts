const prefix = 'wine:photo:'
const eventName = 'wine:photos-changed'

export function setWinePhoto(id: string, dataUrl: string) {
  localStorage.setItem(prefix + id, dataUrl)
  window.dispatchEvent(new Event(eventName))
}

export function removeWinePhoto(id: string) {
  localStorage.removeItem(prefix + id)
  window.dispatchEvent(new Event(eventName))
}

export function getAllWinePhotos(): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(prefix)) out[k.slice(prefix.length)] = localStorage.getItem(k)!
  }
  return out
}
