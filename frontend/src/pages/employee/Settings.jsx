import React, { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { authService } from '../../services/api';
import { User, Lock, Bell } from 'lucide-react';

const S = {
  page:       { display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '680px', fontFamily: 'Inter, sans-serif' },
  pageTitle:  { fontSize: '32px', fontWeight: 700, color: '#111827', margin: 0 },
  pageSub:    { fontSize: '13px', color: '#6B7280', margin: '4px 0 0' },
  card:       { background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  cardHead:   { padding: '14px 18px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', alignItems: 'center', gap: '8px' },
  cardTitle:  { fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 },
  cardBody:   { padding: '16px' },
  lbl:        { fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' },
  input:      { width: '100%', height: '36px', padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', outline: 'none', background: '#F9FAFB', color: '#111827' },
  saveBtn:    { padding: '8px 20px', borderRadius: '6px', background: '#1E3A8A', color: 'white', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  cancelBtn:  { padding: '8px 16px', borderRadius: '6px', background: 'white', color: '#374151', border: '1px solid #E5E7EB', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  toggleRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E5E7EB' },
  toggleLabel:{ fontSize: '13px', fontWeight: 600, color: '#374151' },
  toggleDesc: { fontSize: '12px', color: '#6B7280', marginTop: '1px' },
};

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    style={{
      width: '40px', height: '22px', borderRadius: '999px', border: 'none', cursor: 'pointer',
      background: checked ? '#1E3A8A' : '#E5E7EB', position: 'relative', transition: 'background 0.2s',
      flexShrink: 0,
    }}
  >
    <div style={{
      position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
      width: '16px', height: '16px', borderRadius: '50%', background: 'white',
      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }} />
  </button>
);

const Settings = () => {
  const { user, updateUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email,    setEmail]    = useState(user?.email    || '');

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [notifications, setNotifications] = useState({
    emailAlerts:        true,
    newCaseAssigned:    true,
    documentUploaded:   true,
    clarificationReply: true,
    caseReturned:       true,
    loanDecision:       true,
  });
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const toggleNotif = (key) => setNotifications(prev => ({ ...prev, [key]: !prev[key] }));

  const saveProfile = async () => {
    setSavingProfile(true);
    setNotice({ type: '', message: '' });
    try {
      const result = await authService.updateProfile({ fullName, email });
      if (result?.user) {
        updateUser(result.user);
      }
      setNotice({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setNotice({ type: 'error', message: error?.response?.data?.message || error.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async () => {
    if (newPwd !== confirmPwd) {
      setNotice({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    setNotice({ type: '', message: '' });
    try {
      await authService.updatePassword({
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setNotice({ type: 'success', message: 'Password updated successfully.' });
    } catch (error) {
      setNotice({ type: 'error', message: error?.response?.data?.message || error.message || 'Failed to update password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={S.page}>
      <div>
        <h1 style={S.pageTitle}>Settings</h1>
        <p style={S.pageSub}>Manage your employee profile, credentials and alert preferences</p>
      </div>

      {notice.message && (
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          border: `1px solid ${notice.type === 'error' ? '#FECACA' : '#DCFCE7'}`,
          background: notice.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          color: notice.type === 'error' ? '#B91C1C' : '#166534',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          {notice.message}
        </div>
      )}

      {/* Profile Section */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <User style={{ width: '15px', height: '15px', color: '#1E3A8A' }} />
          <h2 style={S.cardTitle}>Profile Details</h2>
        </div>
        <div style={{ ...S.cardBody, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', background: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
              {(user?.fullName || 'E').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{user?.fullName}</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{user?.role} &nbsp;·&nbsp; {user?.email || user?.id}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: '#F0FDF4', color: '#16A34A', border: '1px solid #DCFCE7' }}>Active Session</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={S.lbl}>Full Name</label>
              <input style={S.input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label style={S.lbl}>Email Address</label>
              <input style={S.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
            </div>
            <div>
              <label style={S.lbl}>Role (Read-only)</label>
              <input style={{ ...S.input, color: '#6B7280', cursor: 'not-allowed' }} value={user?.role || '—'} readOnly />
            </div>
            <div>
              <label style={S.lbl}>Employee ID</label>
              <input style={{ ...S.input, color: '#6B7280', cursor: 'not-allowed', fontFamily: 'monospace' }} value={user?.id || '—'} readOnly />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button style={{ ...S.saveBtn, opacity: savingProfile ? 0.7 : 1 }} onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <Lock style={{ width: '15px', height: '15px', color: '#1E3A8A' }} />
          <h2 style={S.cardTitle}>Change Password</h2>
        </div>
        <div style={{ ...S.cardBody, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={S.lbl}>Current Password</label>
            <input type="password" style={S.input} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Enter current password" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={S.lbl}>New Password</label>
              <input type="password" style={S.input} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min 8 characters" />
            </div>
            <div>
              <label style={S.lbl}>Confirm New Password</label>
              <input type="password" style={S.input} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repeat new password" />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Password must be at least 8 characters, contain uppercase, lowercase and a number.</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button style={S.cancelBtn} onClick={() => { setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }}>Cancel</button>
            <button style={{ ...S.saveBtn, opacity: savingPassword ? 0.7 : 1 }} onClick={updatePassword} disabled={savingPassword}>
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <Bell style={{ width: '15px', height: '15px', color: '#1E3A8A' }} />
          <h2 style={S.cardTitle}>Notification Preferences</h2>
        </div>
        <div style={S.cardBody}>
          {[
            { key: 'emailAlerts',        label: 'Email Alerts',              desc: 'Receive daily digest of queue activity via email' },
            { key: 'newCaseAssigned',     label: 'New Case Assigned',         desc: 'Notify when a new application is assigned to me' },
            { key: 'documentUploaded',    label: 'Customer Uploaded Document', desc: 'Alert when applicant uploads new files' },
            { key: 'clarificationReply',  label: 'Clarification Response',    desc: 'Notify when customer responds to a document request' },
            { key: 'caseReturned',        label: 'Case Returned',             desc: 'Alert when a senior officer returns a case for re-review' },
            { key: 'loanDecision',        label: 'Loan Decision Notification', desc: 'Notify on final Approve or Reject outcomes' },
          ].map((item, idx, arr) => (
            <div key={item.key} style={{ ...S.toggleRow, borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #E5E7EB' }}>
              <div>
                <div style={S.toggleLabel}>{item.label}</div>
                <div style={S.toggleDesc}>{item.desc}</div>
              </div>
              <Toggle checked={notifications[item.key]} onChange={() => toggleNotif(item.key)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
