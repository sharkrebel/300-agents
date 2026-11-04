/// <reference types="vite/client" />
import type { Agents300Api } from '../preload/index'

declare global {
  interface Window {
    agents300: Agents300Api
  }
}

export {}
