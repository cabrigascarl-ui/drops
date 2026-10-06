import {cloudSave} from './cloudService.js'

const STORAGE_KEY = 'tubigbase-data'

export const storageService = {
  load() {
    try {
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{}
    }
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
