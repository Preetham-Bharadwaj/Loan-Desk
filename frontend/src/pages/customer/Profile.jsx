import React, { useMemo } from 'react';
import useAuth from '../../hooks/useAuth';
import { useApplications } from '../../hooks/useLoans';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Primitives';
import { Mail, Phone, MapPin, CheckCircle, Clock } from 'lucide-react';

const CustomerProfile = () => {
  const { user } = useAuth();
  const { data: applications = [] } = useApplications({ customerId: user?.id });

  const latestApp = useMemo(
    () => [...applications].sort((a, b) => new Date(b.submittedAt || b.updatedAt || 0) - new Date(a.submittedAt || a.updatedAt || 0))[0] || null,
    [applications]
  );

  const badgeStyle = (status) => {
    const verified = String(status).toLowerCase() === 'verified' || String(status).toLowerCase() === 'approved';
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: '4px',
      background: verified ? '#e6f4ea' : '#fef7e0',
      color: verified ? '#137333' : '#b06000',
      border: `1px solid ${verified ? '#ceead6' : '#feebc8'}`,
    };
  };

  const docRows = useMemo(() => {
    const docs = latestApp?.documents || {};
    return Object.entries(docs).map(([key, doc]) => ({
      name: key.replace(/([A-Z])/g, ' $1').trim(),
      source: doc.fileName || doc.file_url || 'Uploaded file',
      date: doc.uploaded_at || doc.uploadTime || latestApp?.submittedAt || null,
      status: doc.verification_status ? String(doc.verification_status).charAt(0).toUpperCase() + String(doc.verification_status).slice(1) : 'Pending',
    }));
  }, [latestApp]);

  const formatDate = (value) => {
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Pending';
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="mb-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">My Account Profile</h1>
        <p className="text-sm text-slate-500">Personal details and live KYC status from the latest application record.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1" style={{ height: 'fit-content' }}>
          <CardHeader className="pt-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-display text-xl font-bold mb-3 shadow-md">
              {(user?.fullName || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)}
            </div>
            <CardTitle className="text-base font-bold">{user?.fullName}</CardTitle>
            <CardDescription className="text-xs">CIF/Customer ID: {user?.id || 'N/A'}</CardDescription>
          </CardHeader>
          <CardContent style={{ padding: '0 20px 20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <div className="space-y-3 text-xs">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-slate-400">Account Tier</span>
                <span className="font-bold text-slate-700">Retail Banking</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-slate-400">KYC Status</span>
                <span style={{ color: '#137333', fontWeight: 700 }}>{latestApp?.reviews?.verification?.status || 'Pending'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b pb-3 mb-4">
              <CardTitle className="text-sm">Personal &amp; Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personal Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Full Legal Name</span>
                    <span className="font-bold text-slate-800">{user?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Date of Birth</span>
                    <span className="font-bold text-slate-800">{latestApp?.applicantDetails?.dob || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Communication Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-slate-500">Registered Email</p>
                      <p className="font-semibold text-slate-800">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-slate-500">Mobile Number</p>
                      <p className="font-semibold text-slate-800">{user?.phone || latestApp?.applicantDetails?.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-slate-500">Mailing Address</p>
                      <p className="font-semibold text-slate-800">{user?.address || latestApp?.applicantDetails?.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-3 mb-4">
              <CardTitle className="text-sm">KYC &amp; Verification status details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center" style={{ marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>KYC Status</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#137333', marginTop: '3px', display: 'block' }}>{latestApp?.reviews?.verification?.status || 'Pending'}</span>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Latest Loan</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginTop: '3px', display: 'block' }}>{latestApp?.loanType || 'N/A'}</span>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 8px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Application Status</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', marginTop: '3px', display: 'block' }}>{latestApp?.status || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {docRows.length === 0 ? (
                  <div style={{ padding: '16px', border: '1px dashed #e2e8f0', borderRadius: '8px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>
                    No document metadata is available yet.
                  </div>
                ) : (
                  docRows.map((item) => (
                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px 14px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{item.name}</span>
                          <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>({item.source})</span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                          Verification Date: {formatDate(item.date)}
                        </span>
                      </div>
                      <span style={badgeStyle(item.status)}>
                        {String(item.status).toLowerCase() === 'verified' ? <CheckCircle style={{ width: '12px', height: '12px' }} /> : <Clock style={{ width: '12px', height: '12px' }} />}
                        {item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
