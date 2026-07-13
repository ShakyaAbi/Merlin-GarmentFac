
import React, { useEffect, useState } from 'react';
import { CurrentUser } from '../types';
import { api } from '../services/api';
import { User, Lock, Mail, Shield, Calendar, Server, KeyRound, Database } from 'lucide-react';
import { formatNepaliDate } from '../utils/nepaliDate';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'system'>('profile');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationProfile, setOrganizationProfile] = useState<NonNullable<CurrentUser['organizationProfile']>>({
    name: '', taxpayerNumber: '', registrationNumber: '', address: '', city: '', district: '', province: '', postalCode: '', country: 'Nepal', phone: '', email: '', invoiceFooter: '', resetSalesInvoiceSequenceEachFiscalYear: true,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
  const authMode = import.meta.env.VITE_AUTH_DISABLED === 'true' ? 'Local dev bypass only' : 'JWT enforced';

  useEffect(() => {
    api.me()
      .then((data) => {
        setUser(data);
        setOrganizationName(data?.organization || '');
        setOrganizationProfile({
          name: data?.organization || '',
          taxpayerNumber: data?.organizationProfile?.taxpayerNumber || '',
          registrationNumber: data?.organizationProfile?.registrationNumber || '',
          address: data?.organizationProfile?.address || '',
          city: data?.organizationProfile?.city || '',
          district: data?.organizationProfile?.district || '',
          province: data?.organizationProfile?.province || '',
          postalCode: data?.organizationProfile?.postalCode || '',
          country: data?.organizationProfile?.country || 'Nepal',
          phone: data?.organizationProfile?.phone || '',
          email: data?.organizationProfile?.email || '',
          invoiceFooter: data?.organizationProfile?.invoiceFooter || '',
          resetSalesInvoiceSequenceEachFiscalYear: data?.organizationProfile?.resetSalesInvoiceSequenceEachFiscalYear ?? true,
        });
      })
      .catch((error) => {
        console.error('Failed to load user profile', error);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (value?: string) => formatNepaliDate(value, '-');

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
      <>
        <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 mt-1">View your account details and system settings status.</p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
           {[
             { id: 'profile', label: 'My Profile', icon: User },
             { id: 'security', label: 'Security', icon: Lock },
             { id: 'system', label: 'System', icon: Server },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`
                 w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                 ${activeTab === tab.id 
                   ? 'bg-blue-50 text-blue-700' 
                   : 'text-slate-600 hover:bg-white hover:text-slate-900'}
               `}
             >
               <tab.icon className={`w-4 h-4 mr-3 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`} />
               {tab.label}
             </button>
           ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-3xl">
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-6 md:p-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Account Information</h2>
                    <p className="text-sm text-slate-500">These details are pulled from your authenticated account.</p>
                  </div>

                  {!user && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                      Unable to load account details. Please log in again.
                    </div>
                  )}

                  {user && (
                    <div className="space-y-6">
                      <form
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5 space-y-4"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          setProfileError(null);
                          setProfileSuccess(null);
                          const nextName = organizationProfile.name.trim();
                          if (!nextName) {
                            setProfileError('Organization name is required.');
                            return;
                          }
                          const requiredFields: Array<[keyof typeof organizationProfile, string]> = [
                            ['taxpayerNumber', 'PAN / VAT / TPIN'],
                            ['address', 'Business address'],
                            ['city', 'City'],
                            ['district', 'District'],
                            ['province', 'Province'],
                            ['country', 'Country'],
                            ['phone', 'Phone'],
                            ['email', 'Invoice email'],
                          ];
                          const missingField = requiredFields.find(([key]) => !String(organizationProfile[key] || '').trim());
                          if (missingField) {
                            setProfileError(`${missingField[1]} is required.`);
                            return;
                          }
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(organizationProfile.email).trim())) {
                            setProfileError('Invoice email must be a valid email address.');
                            return;
                          }

                          try {
                            setProfileSaving(true);
                            const updated = await api.updateMe({
                              organization: nextName,
                              ...organizationProfile,
                              name: undefined,
                            });
                            setUser(updated);
                            setOrganizationName(updated.organization || nextName);
                            setOrganizationProfile(updated.organizationProfile || organizationProfile);
                            setProfileSuccess('Organization invoice settings updated.');
                          } catch (error: any) {
                            setProfileError(error?.message || 'Failed to update organization name.');
                          } finally {
                            setProfileSaving(false);
                          }
                        }}
                      >
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Organization branding</h3>
                          <p className="text-sm text-slate-500">This name appears on invoices and other organization-facing documents.</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Organization name <span className="text-red-600">*</span></label>
                          <input
                            type="text"
                            value={organizationProfile.name}
                            onChange={(event) => setOrganizationProfile((current) => ({ ...current, name: event.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 bg-white rounded-md text-slate-900"
                            placeholder="Enter organization name"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {([
                            ['taxpayerNumber', 'PAN / VAT / TPIN', true], ['registrationNumber', 'Registration number', false],
                            ['address', 'Business address', true], ['city', 'City', true], ['district', 'District', true],
                            ['province', 'Province', true], ['postalCode', 'Postal code', false], ['country', 'Country', true],
                            ['phone', 'Phone', true], ['email', 'Invoice email', true],
                          ] as const).map(([key, label, required]) => (
                            <div key={key}>
                              <label className="block text-sm font-medium text-slate-700 mb-1">{label} {required ? <span className="text-red-600">*</span> : null}</label>
                              <input
                                type={key === 'email' ? 'email' : 'text'}
                                value={organizationProfile[key] || ''}
                                onChange={(event) => setOrganizationProfile((current) => ({ ...current, [key]: event.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-md text-slate-900"
                                required={required}
                              />
                            </div>
                          ))}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Invoice footer</label>
                          <textarea
                            value={organizationProfile.invoiceFooter || ''}
                            onChange={(event) => setOrganizationProfile((current) => ({ ...current, invoiceFooter: event.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 bg-white rounded-md text-slate-900"
                            rows={3}
                            placeholder="Optional note printed at the bottom of invoices"
                          />
                        </div>
                        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                          <input
                            type="checkbox"
                            checked={organizationProfile.resetSalesInvoiceSequenceEachFiscalYear}
                            onChange={(event) => setOrganizationProfile((current) => ({ ...current, resetSalesInvoiceSequenceEachFiscalYear: event.target.checked }))}
                            className="mt-1 h-4 w-4"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-slate-900">Reset sales invoice numbering every fiscal year</span>
                            <span className="block text-xs text-slate-500 mt-1">When enabled, numbering starts at 00001 for the next fiscal year. Existing invoices are unchanged.</span>
                          </span>
                        </label>
                        {profileError ? (
                          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {profileError}
                          </div>
                        ) : null}
                        {profileSuccess ? (
                          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                            {profileSuccess}
                          </div>
                        ) : null}
                        <div className="flex items-center justify-end">
                          <button
                            type="submit"
                            disabled={profileSaving}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                          >
                            {profileSaving ? 'Saving...' : 'Save organization name'}
                          </button>
                        </div>
                      </form>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={user.email}
                              disabled
                              className="w-full pl-9 px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-slate-600"
                            />
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={user.role}
                              disabled
                              className="w-full pl-9 px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-slate-600"
                            />
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">User ID</label>
                          <input
                            type="text"
                            value={user.id}
                            disabled
                            className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-slate-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Joined</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={formatDate(user.createdAt)}
                              disabled
                              className="w-full pl-9 px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-slate-600"
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* System Tab */}
              {activeTab === 'system' && (
                <div className="p-6 md:p-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">System Settings</h2>
                    <p className="text-sm text-slate-500">Read-only environment and runtime information for this Merlin session.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Server className="w-4 h-4 text-slate-500" />
                        API Base URL
                      </div>
                      <div className="mt-2 text-sm text-slate-900 break-all">{apiBase}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <KeyRound className="w-4 h-4 text-slate-500" />
                        Auth Mode
                      </div>
                      <div className="mt-2 text-sm text-slate-900">{authMode}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Database className="w-4 h-4 text-slate-500" />
                        Connected Features
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Inventory, sales, payments, expenses, production, exports, and customer master data are available from the current app shell.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-6 md:p-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Security Settings</h2>
                    <p className="text-sm text-slate-500">Manage your account security settings.</p>
                  </div>

                  <div className="border border-slate-200 rounded-md bg-slate-50 p-4">
                    <h3 className="text-sm font-medium text-slate-900">Change password</h3>
                    <p className="text-sm text-slate-500 mb-3">Update your account password. Choose a strong, unique password.</p>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSecurityError(null);
                        setSecuritySuccess(null);
                        if (newPassword !== confirmPassword) {
                          setSecurityError('New password and confirmation do not match');
                          return;
                        }
                        if (newPassword.length < 8) {
                          setSecurityError('Password must be at least 8 characters');
                          return;
                        }
                        try {
                          setChanging(true);
                          await api.changePassword(currentPassword, newPassword);
                          setSecuritySuccess('Password updated successfully');
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        } catch (err: any) {
                          setSecurityError(err?.message || 'Failed to change password');
                        } finally {
                          setChanging(false);
                        }
                      }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
                          required
                        />
                      </div>

                      {securityError && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{securityError}</div>
                      )}
                      {securitySuccess && (
                        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">{securitySuccess}</div>
                      )}

                      <div className="text-right">
                        <button
                          type="submit"
                          disabled={changing}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
                        >
                          {changing ? 'Updating…' : 'Update password'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="text-sm text-slate-500">Account deletion is not available from this UI yet.</div>
                </div>
              )}

           </div>
        </div>
      </div>
    </>
  );
};
