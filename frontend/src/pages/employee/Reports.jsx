import React from 'react';
import { useApplications } from '../../hooks/useLoans';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Primitives';
import { BarChart3, TrendingUp, ShieldAlert, Award } from 'lucide-react';

const Reports = () => {
  const { data: applications = [], isLoading } = useApplications();

  // Basic calculation statistics
  const approved = applications.filter(a => a.status === 'Approved');
  const rejected = applications.filter(a => a.status === 'Rejected');
  const pending = applications.filter(a => !['Approved', 'Rejected'].includes(a.status));

  const totalVolumeApproved = approved.reduce((acc, curr) => acc + curr.amount, 0);
  const totalVolumePending = pending.reduce((acc, curr) => acc + curr.amount, 0);

  // Group by loan type
  const loanTypesCount = applications.reduce((acc, app) => {
    acc[app.loanType] = (acc[app.loanType] || 0) + 1;
    return acc;
  }, {});

  // Group by risk level
  const riskCount = applications.reduce((acc, app) => {
    if (app.reviews.credit.riskLevel) {
      acc[app.reviews.credit.riskLevel] = (acc[app.reviews.credit.riskLevel] || 0) + 1;
    }
    return acc;
  }, { Low: 0, Medium: 0, High: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-slate-700" /> Analytical Reports
        </h1>
        <p className="text-sm text-slate-500">System-wide dashboard tracking credit exposure, application results, and risk profiles.</p>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-slate-500">Compiling statistics...</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          
          {/* Portfolio Exposure */}
          <Card>
            <CardHeader className="border-b pb-3 mb-4">
              <CardTitle className="text-sm flex items-center"><TrendingUp className="w-4 h-4 mr-1.5 text-indigo-500" /> Credit Capital Exposure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Approved Disbursement Volume</span>
                  <span className="font-bold text-slate-900 font-display">₹{totalVolumeApproved.toLocaleString()}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Queue Pipeline Volume</span>
                  <span className="font-bold text-slate-900 font-display">₹{totalVolumePending.toLocaleString()}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '40%' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary Chart */}
          <Card>
            <CardHeader className="border-b pb-3 mb-4">
              <CardTitle className="text-sm flex items-center"><Award className="w-4 h-4 mr-1.5 text-emerald-500" /> Decision Outcomes Ratio</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="text-lg font-bold text-emerald-700 font-display">{approved.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Approved</p>
              </div>
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-lg font-bold text-red-700 font-display">{rejected.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Rejected</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-lg font-bold text-amber-700 font-display">{pending.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">In Review</p>
              </div>
            </CardContent>
          </Card>

          {/* Loan Product Breakdown */}
          <Card>
            <CardHeader className="border-b pb-3 mb-4">
              <CardTitle className="text-sm">Product Classification Ratio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(loanTypesCount).map((type) => {
                const count = loanTypesCount[type];
                const pct = ((count / applications.length) * 100).toFixed(0);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>{type} Loans</span>
                      <span>{count} files ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-800 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Risk assessment Breakdown */}
          <Card>
            <CardHeader className="border-b pb-3 mb-4">
              <CardTitle className="text-sm flex items-center"><ShieldAlert className="w-4 h-4 mr-1.5 text-rose-500" /> Credit Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Low Risk Profiles</span>
                  <span className="text-emerald-600 font-bold">{riskCount.Low} applications</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(riskCount.Low / applications.length) * 100 || 0}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Medium Risk Profiles</span>
                  <span className="text-amber-600 font-bold">{riskCount.Medium} applications</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(riskCount.Medium / applications.length) * 100 || 0}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>High Risk Profiles</span>
                  <span className="text-red-600 font-bold">{riskCount.High} applications</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${(riskCount.High / applications.length) * 100 || 0}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
};

export default Reports;
