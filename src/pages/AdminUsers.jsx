import React, { useState } from 'react';
import Card from '../components/Card';
import { Users, Search, ShieldCheck, ShieldOff, UserPlus } from 'lucide-react';

const MOCK_USERS = [
  { id: 1, name: 'Dr. Sarah Jenkins', email: 'dr.jenkins@medsecure.local', role: 'Doctor', department: 'Cardiology', status: 'Active', lastLogin: '2026-03-02 09:12', mfaEnabled: true },
  { id: 2, name: 'Nurse Mark Reyes', email: 'nurse.reyes@medsecure.local', role: 'Nurse', department: 'ICU', status: 'Active', lastLogin: '2026-03-02 08:40', mfaEnabled: true },
  { id: 3, name: 'Dr. Robert Smith', email: 'dr.smith@medsecure.local', role: 'Doctor', department: 'Neurology', status: 'Active', lastLogin: '2026-03-01 17:55', mfaEnabled: false },
  { id: 4, name: 'Admin User', email: 'admin@medsecure.local', role: 'Admin', department: 'IT Security', status: 'Active', lastLogin: '2026-03-02 07:30', mfaEnabled: true },
  { id: 5, name: 'Jane Miller', email: 'receptionist.miller@medsecure.local', role: 'Receptionist', department: 'Front Desk', status: 'Active', lastLogin: '2026-03-02 08:00', mfaEnabled: false },
  { id: 6, name: 'Marcus Sterling', email: 'patient.sterling@medsecure.local', role: 'Patient', department: 'N/A', status: 'Active', lastLogin: '2026-02-28 11:05', mfaEnabled: false },
  { id: 7, name: 'Dr. Angela Yuen', email: 'dr.yuen@medsecure.local', role: 'Doctor', department: 'Oncology', status: 'Suspended', lastLogin: '2026-02-20 14:00', mfaEnabled: true },
];

const ROLE_COLORS = {
  Admin: 'text-[var(--color-accent-cyan)] border-[var(--color-accent-cyan)]',
  Doctor: 'text-[var(--color-accent-success)] border-[var(--color-accent-success)]',
  Nurse: 'text-[var(--color-accent-warning)] border-[var(--color-accent-warning)]',
  Receptionist: 'text-[var(--color-text-secondary)] border-[var(--color-border)]',
  Patient: 'text-[var(--color-text-secondary)] border-[var(--color-border)]',
};

const STATUS_PILL = {
  Active: 'bg-[var(--color-accent-success)]/10 text-[var(--color-accent-success)] border border-[var(--color-accent-success)]',
  Suspended: 'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] border border-[var(--color-accent-red)]',
};

const ROLE_COUNTS = MOCK_USERS.reduce((acc, u) => {
  acc[u.role] = (acc[u.role] || 0) + 1;
  return acc;
}, {});

const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const roles = ['All', 'Admin', 'Doctor', 'Nurse', 'Receptionist', 'Patient'];

  const filtered = MOCK_USERS.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] uppercase tracking-tight">User Management</h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider mt-1">
            Personnel directory, access roles, and MFA compliance.
          </p>
        </div>
        <button onClick={() => { setShowProvisionModal(true); setSelectedUser(null); }} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] border border-[var(--color-accent-cyan)] text-[var(--color-accent-cyan)] hover:bg-[var(--color-accent-cyan)]/10 transition-colors rounded-[2px]">
          <UserPlus className="w-3.5 h-3.5" />
          Provision User
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: MOCK_USERS.length },
          { label: 'Active', value: MOCK_USERS.filter(u => u.status === 'Active').length },
          { label: 'MFA Enrolled', value: MOCK_USERS.filter(u => u.mfaEnabled).length },
          { label: 'Suspended', value: MOCK_USERS.filter(u => u.status === 'Suspended').length },
        ].map((stat) => (
          <Card key={stat.label} className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">{stat.label}</span>
            <p className="text-3xl font-black text-[var(--color-text-primary)] mt-3">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filter / Search */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 border border-[var(--color-border)] rounded-[2px] px-3 py-2 w-full sm:max-w-xs bg-[var(--color-primary)]">
            <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
            <input
              className="bg-transparent text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] outline-none w-full"
              placeholder="Search by name, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] border rounded-[2px] transition-colors ${
                  roleFilter === r
                    ? 'bg-[var(--color-accent-cyan)] text-black border-[var(--color-accent-cyan)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-secondary)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--color-secondary)] border-b border-[var(--color-border)]">
                {['Name', 'Email', 'Role', 'Department', 'Last Login', 'MFA', 'Status', 'Actions'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)] font-black">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
                    No users match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((user, idx) => (
                  <tr
                    key={user.id}
                    className={`border-b border-[var(--color-border)] hover:bg-[var(--color-secondary)] transition-colors ${
                      idx % 2 === 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-card)]'
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">{user.name}</td>
                    <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 border text-[9px] font-black uppercase tracking-[0.2em] rounded-[1px] ${ROLE_COLORS[user.role] || ''}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{user.department}</td>
                    <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">{user.lastLogin}</td>
                    <td className="px-4 py-3">
                      {user.mfaEnabled ? (
                        <ShieldCheck className="w-4 h-4 text-[var(--color-accent-success)]" />
                      ) : (
                        <ShieldOff className="w-4 h-4 text-[var(--color-accent-red)]" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-[1px] ${STATUS_PILL[user.status]}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setShowProvisionModal(true); setSelectedUser(user); }} className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-accent-cyan)] hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Provision/Edit Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <h2 className="text-lg font-black text-[var(--color-text-primary)] uppercase mb-4">
              {selectedUser ? 'Edit User' : 'Provision New User'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--color-text-secondary)]">Name</label>
                <input type="text" placeholder="Full Name" defaultValue={selectedUser?.name || ''} className="w-full bg-[var(--color-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-[2px] text-xs mt-1 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--color-text-secondary)]">Email</label>
                <input type="email" placeholder="Email Address" defaultValue={selectedUser?.email || ''} className="w-full bg-[var(--color-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-[2px] text-xs mt-1 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-[var(--color-text-secondary)]">Role</label>
                <select defaultValue={selectedUser?.role || 'Doctor'} className="w-full bg-[var(--color-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-3 py-2 rounded-[2px] text-xs mt-1 outline-none">
                  <option>Admin</option>
                  <option>Doctor</option>
                  <option>Nurse</option>
                  <option>Receptionist</option>
                  <option>Patient</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => { setShowProvisionModal(false); setSelectedUser(null); }} className="px-4 py-2 text-[10px] font-black uppercase border border-[var(--color-border)] rounded-[2px] hover:bg-[var(--color-secondary)]">Cancel</button>
              <button onClick={() => { alert('User ' + (selectedUser ? 'updated' : 'created') + ' successfully!'); setShowProvisionModal(false); setSelectedUser(null); }} className="px-4 py-2 text-[10px] font-black uppercase bg-[var(--color-accent-cyan)] text-black rounded-[2px]">Save</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
