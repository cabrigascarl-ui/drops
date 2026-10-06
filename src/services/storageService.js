import {cloudSave} from './cloudService.js'

const STORAGE_KEY = 'tubigbase-data'

export const storageService = {
  load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
    catch { return {} }
  },
  save(data) {
    try {
      const payload = {...data, savedAt: Date.now()}
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      cloudSave(payload)
      return true
    }
    catch { return false }
  }
}
