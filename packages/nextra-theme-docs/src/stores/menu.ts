import type { Dispatch, SetStateAction } from 'react'
import { create } from 'zustand'

const useMenuStore = create<{
  hasMenu: boolean
}>(() => ({
  hasMenu: false
}))

export const useMenu = () => useMenuStore(state => state.hasMenu)

export const setMenu: Dispatch<SetStateAction<boolean>> = fn => {
  useMenuStore.setState(state => {
    const hasMenu = typeof fn === 'function' ? fn(state.hasMenu) : fn
    // Lock background scroll when menu is opened
    document.body.classList.toggle('max-md:_overflow-hidden', hasMenu)
    return { hasMenu }
  })
}
