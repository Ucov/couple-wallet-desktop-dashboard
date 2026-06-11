import PocketBase from 'pocketbase'

const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://192.168.1.11:8090'

export const pb = new PocketBase(pbUrl)
