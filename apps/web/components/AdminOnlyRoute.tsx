import React from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from './auth/CurrentUserContext'

export const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useCurrentUser()

  if (!user) {
    return <div className="p-8 text-center text-slate-500">Checking permissions...</div>
  }

  return user.role === 'ADMIN' ? <>{children}</> : <Navigate to="/settings" replace />
}
