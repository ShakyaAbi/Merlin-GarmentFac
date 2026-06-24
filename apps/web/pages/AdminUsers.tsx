import React, { useEffect, useState, useRef } from 'react';
import { authApi, OrganizationUser } from '../services/authApi';
import { Users as UsersIcon, Shield, Mail, Calendar, ChevronDown, Trash2 } from 'lucide-react';
import { formatNepaliDate } from '../utils/nepaliDate';

const ROLES = [
  { value: 'ADMIN', label: 'Admin', description: 'Full access to all features' },
  { value: 'MANAGER', label: 'Manager', description: 'Can manage projects and data' },
  { value: 'DATA_ENTRY', label: 'Data Entry', description: 'Can only edit own submissions' },
];

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUsers = async () => {
    try {
      const data = await authApi.listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdating(userId);
    try {
      await authApi.updateUserRole(userId, newRole);
      loadUsers();
    } catch (err) {
      console.error('Failed to update role', err);
    } finally {
      setUpdating(null);
      setShowRoleDropdown(null);
    }
  };

  const handleRemoveUser = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) return;
    try {
      await authApi.removeUser(userId);
      loadUsers();
    } catch (err) {
      alert('Failed to remove user');
    }
  };

  const formatDate = (dateStr: string) => formatNepaliDate(dateStr);

  const getRoleBadge = (role: string) => {
    const roleConfig = ROLES.find(r => r.value === role);
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
        role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
        role === 'DATA_ENTRY' ? 'bg-green-100 text-green-700' :
        'bg-slate-100 text-slate-700'
      }`}>
        {roleConfig?.label || role}
      </span>
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
        <p className="text-slate-500 mt-1">Manage your organization's team members and roles.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Joined</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        {user.name ? (
                          <span className="text-sm font-medium text-slate-600">
                            {user.name.substring(0, 2).toUpperCase()}
                          </span>
                        ) : (
                          <Mail className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {user.name || 'No name'}
                        </div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                        {user.jobTitle && (
                          <div className="text-xs text-slate-400">{user.jobTitle}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowRoleDropdown(showRoleDropdown === user.id ? null : user.id)}
                        disabled={updating === user.id}
                        className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1 -ml-2 transition-colors"
                      >
                        {getRoleBadge(user.role)}
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </button>
                      {showRoleDropdown === user.id && (
                        <div className="fixed z-[100] mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1">
                          {ROLES.map((role) => (
                            <button
                              key={role.value}
                              onClick={() => handleRoleChange(user.id, role.value)}
                              className="w-full px-4 py-2 text-left hover:bg-slate-50 flex flex-col"
                            >
                              <span className="font-medium text-slate-900">{role.label}</span>
                              <span className="text-xs text-slate-500">{role.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(user.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <UsersIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>No team members found</p>
        </div>
      )}
    </>
  );
};
