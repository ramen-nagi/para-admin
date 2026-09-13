import { createContext, useContext } from 'react'

export const RoleContext = createContext(null)
export const useStaffRole = () => useContext(RoleContext)
