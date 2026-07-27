import React, { createContext, useContext } from 'react'
import type { CurrentUser } from '../../types'

type UserCapabilities = {
  user: CurrentUser | null
  isDataEntry: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canIssue: boolean
  canComplete: boolean
}

const CurrentUserContext = createContext<UserCapabilities | null>(null)

export const CurrentUserProvider: React.FC<{ user: CurrentUser | null; children: React.ReactNode }> = ({ user, children }) => {
  const role = String(user?.role || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  const isDataEntry = role === 'DATA_ENTRY' || role === 'DATAENTRY'
  const canCreate = role === 'ADMIN' || role === 'MANAGER' || isDataEntry
  const canEdit = role === 'ADMIN' || role === 'MANAGER'
  const canDelete = role === 'ADMIN'

  return (
    <CurrentUserContext.Provider value={{ user, isDataEntry, canCreate, canEdit, canDelete, canIssue: canCreate, canComplete: canCreate }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export const useCurrentUser = () => {
  const context = useContext(CurrentUserContext)
  if (!context) throw new Error('useCurrentUser must be used inside CurrentUserProvider')
  return context
}
