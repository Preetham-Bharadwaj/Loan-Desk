import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useApplyLoan } from '../../hooks/useLoans';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, Select, Textarea, Alert } from '../../components/ui/Primitives';
import { 
  Building2, User, Briefcase, IndianRupee, FileText, CheckCircle, 
  ChevronRight, ChevronLeft, Upload, Sparkles, AlertCircle, Info, Loader2
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Loan Type', icon: Building2 },
  { id: 2, title: 'Personal Details', icon: User },
  { id: 3, title: 'Employment Details', icon: Briefcase },
  { id: 4, title: 'Loan Requirements', icon: IndianRupee },
  { id: 5, title: 'Document Uploads', icon: FileText },
  { id: 6, title: 'Review & Submit', icon: CheckCircle }
];

const LOAN_TYPES = [
  { value: 'Personal', description: 'Emergency, medical, wedding, or general consumer needs', minAmount: 50000, maxAmount: 2000000, interestRate: 10.5, tenure: 'Up to 5 Years', time: '3–5 Days' },
  { value: 'Home', description: 'Finance purchase, construction, or extension of your house', minAmount: 1000000, maxAmount: 100000000, interestRate: 8.55, tenure: 'Up to 30 Years', time: '7–10 Days' },
  { value: 'Vehicle', description: 'Loans for new/used two-wheelers or four-wheelers', minAmount: 100000, maxAmount: 5000000, interestRate: 9.25, tenure: 'Up to 7 Years', time: '2–3 Days' },
  { value: 'Education', description: 'Funding higher education in universities', minAmount: 200000, maxAmount: 15000000, interestRate: 9.85, tenure: 'Up to 15 Years', time: '4–5 Days' },
  { value: 'Business', description: 'Working capital and term finance for established enterprises', minAmount: 500000, maxAmount: 50000000, interestRate: 12.0, tenure: 'Up to 7 Years', time: '5–7 Days' },
  { value: 'Startup', description: 'Capital funding and expansion lines for emerging startups', minAmount: 1000000, maxAmount: 100000000, interestRate: 13.5, tenure: 'Up to 5 Years', time: '10–14 Days' }
];

const getRequiredDocsForType = (type) => {
  const base = [
    { key: 'aadhaar', label: 'Aadhaar Card', desc: 'Front & back copy in PDF format' },
    { key: 'pan', label: 'PAN Card', desc: 'Clear scan of tax card' },
    { key: 'bankStatement', label: 'Bank Statement', desc: '6 months certified statement' },
    { key: 'photo', label: 'Passport Photo', desc: 'Recent passport crop' }
  ];

  let specDoc = { key: 'salarySlip', label: 'Salary Slip', desc: 'Latest 3 months salary slip' };

  if (type === 'Home') {
    specDoc = { key: 'businessDocs', label: 'Property Documents', desc: 'Sale agreement or title deed' };
  } else if (type === 'Vehicle') {
    specDoc = { key: 'businessDocs', label: 'Vehicle Invoice', desc: 'Dealer cost quotation' };
  } else if (type === 'Education') {
    specDoc = { key: 'businessDocs', label: 'Admission Letter', desc: 'Offer letter from university' };
  } else if (type === 'Business' || type === 'Startup') {
    specDoc = { key: 'businessDocs', label: 'GST Certificate', desc: 'GSTIN registration certificate' };
  }

  return [...base, specDoc];
};

const ApplyLoan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const applyLoanMutation = useApplyLoan();

  const [currentStep, setCurrentStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [applicantCategory, setApplicantCategory] = useState('Salaried');
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadingStates, setUploadingStates] = useState({}); // { [key]: 'uploading' | 'success' }
  const [submittedApp, setSubmittedApp] = useState(null);

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      customerId: user?.id || 'cust_1',
      loanType: '',
      applicantDetails: {
        fullName: user?.fullName || '',
        dob: '',
        phone: user?.phone || '',
        email: user?.email || '',
        aadhaar: '',
        pan: '',
        address: ''
      },
      employmentDetails: {
        employmentType: 'Salaried',
        employer: '', // Company Name
        monthlyIncome: '',
        businessName: '',
        annualIncome: '',
        collegeName: '',
        guardianIncome: ''
      },
      amount: '',
      tenureMonths: '',
      purpose: '',
      consentDeclared: false
    }
  });

  const formValues = watch();

  // EMI and calculations
  const calculateEMI = () => {
    const p = Number(formValues.amount);
    const months = Number(formValues.tenureMonths);
    const rate = selectedLoan ? selectedLoan.interestRate : 10.5;
    if (!p || !months) return { emi: 0, processingFee: 0, rate };

    const r = rate / 12 / 100;
    const emi = Math.round(p * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
    const processingFee = Math.max(2500, Math.round(p * 0.01));
    return { emi, processingFee, rate };
  };

  const { emi, processingFee, rate } = calculateEMI();

  const handleSelectLoanType = (loan) => {
    setSelectedLoan(loan);
    setValue('loanType', loan.value);
    setValue('amount', loan.minAmount);
    setValue('tenureMonths', loan.value === 'Home' ? 240 : 36);
    setErrorMsg('');
  };

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingStates(prev => ({ ...prev, [key]: 'uploading' }));
      setUploadedFiles(prev => ({ ...prev, [key]: null }));
      
      setTimeout(() => {
        setUploadedFiles(prev => ({
          ...prev,
          [key]: file
        }));
        setUploadingStates(prev => ({ ...prev, [key]: 'success' }));
      }, 800);
    }
  };

  const handleNext = () => {
    setErrorMsg('');

    if (currentStep === 1) {
      if (!formValues.loanType) {
        setErrorMsg('Please select a loan type to proceed.');
        return;
      }
    }

    if (currentStep === 2) {
      const p = formValues.applicantDetails;
      if (!p.fullName || !p.dob || !p.phone || !p.email || !p.aadhaar || !p.pan || !p.address) {
        setErrorMsg('Please fill out all personal details.');
        return;
      }
      if (!/^\d{12}$/.test(p.aadhaar.replace(/\s/g, ''))) {
        setErrorMsg('Aadhaar number must be a 12-digit numeric value.');
        return;
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(p.pan)) {
        setErrorMsg('PAN card format must match standard pattern (e.g. ABCDE1234F).');
        return;
      }
    }

    if (currentStep === 3) {
      const e = formValues.employmentDetails;
      if (applicantCategory === 'Salaried') {
        if (!e.employer || !e.monthlyIncome) {
          setErrorMsg('Please enter your company name and monthly income.');
          return;
        }
      } else if (applicantCategory === 'Self Employed') {
        if (!e.businessName || !e.annualIncome) {
          setErrorMsg('Please enter your business name and annual income.');
          return;
        }
      } else if (applicantCategory === 'Student') {
        if (!e.collegeName || !e.guardianIncome) {
          setErrorMsg('Please enter your college name and guardian income.');
          return;
        }
      }
    }

    if (currentStep === 4) {
      const amt = Number(formValues.amount);
      const tenure = Number(formValues.tenureMonths);
      if (!amt || !tenure || !formValues.purpose) {
        setErrorMsg('Please specify loan amount, tenure, and purpose.');
        return;
      }
      if (amt < selectedLoan.minAmount || amt > selectedLoan.maxAmount) {
        setErrorMsg(`Loan amount must be between ₹${selectedLoan.minAmount.toLocaleString()} and ₹${selectedLoan.maxAmount.toLocaleString()} for this product.`);
        return;
      }
    }

    if (currentStep === 5) {
      const docs = getRequiredDocsForType(formValues.loanType);
      const missing = docs.filter(d => !uploadedFiles[d.key]);
      if (missing.length > 0) {
        setErrorMsg(`Please upload all required files. Missing: ${missing.map(m => m.label).join(', ')}.`);
        return;
      }
      const isUploading = Object.values(uploadingStates).some(status => status === 'uploading');
      if (isUploading) {
        setErrorMsg('Please wait for all document uploads to complete.');
        return;
      }
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setErrorMsg('');
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const onFormSubmit = async (data) => {
    setErrorMsg('');
    if (!formValues.consentDeclared) {
      setErrorMsg('Please confirm that the information provided is accurate.');
      return;
    }

    const formData = new FormData();
    formData.append('customerId', data.customerId || user?.id || '');
    formData.append('loanType', data.loanType);
    formData.append('amount', String(Number(data.amount)));
    formData.append('tenureMonths', String(Number(data.tenureMonths)));
    formData.append('purpose', data.purpose || '');
    formData.append('applicantDetails', JSON.stringify({
      ...data.applicantDetails,
      phone: data.applicantDetails?.phone || user?.phone || '',
      email: data.applicantDetails?.email || user?.email || '',
    }));
    formData.append('employmentDetails', JSON.stringify({
      ...data.employmentDetails,
      employmentType: applicantCategory
    }));

    Object.entries(uploadedFiles).forEach(([key, file]) => {
      if (file instanceof File) {
        formData.append(key, file, file.name);
      }
    });

    try {
      const result = await applyLoanMutation.mutateAsync(formData);
      setSubmittedApp(result);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error submitting application. Please try again.');
    }
  };

  const docs = getRequiredDocsForType(formValues.loanType);

  const S = {
    lbl:    { color: '#64748b', display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
    val:    { fontWeight: 700, color: '#334155', fontSize: '13px' },
  };

  if (submittedApp) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '580px', margin: '40px auto' }}>
        <Card style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#f0fdf4', padding: '40px 20px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle style={{ width: '32px', height: '32px' }} />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 800, color: '#166534', margin: 0 }}>
              Application Submitted Successfully
            </h1>
            <p style={{ fontSize: '12px', color: '#15803d', margin: '4px 0 0' }}>
              Your loan application has been registered.
            </p>
          </div>

          <CardContent style={{ padding: '24px 32px', fontSize: '13px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Application ID</span>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '14px', color: '#2563eb' }}>{submittedApp.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Current Status</span>
                <span style={{ fontWeight: 700, color: '#d97706' }}>Submitted</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Estimated Processing Time</span>
                <span style={{ fontWeight: 700, color: '#334155' }}>3-5 Business Days</span>
              </div>
            </div>
          </CardContent>

          <CardFooter style={{ background: '#fafafa', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', padding: '16px' }}>
            <Button
              onClick={() => navigate('/customer/my-applications')}
              style={{ padding: '10px 24px', background: '#0f172a', color: 'white', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              Go to My Applications
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Wizard Header Progress Bar */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '600px' }}>
          {STEPS.map((step) => {
            const done = step.id < currentStep;
            const current = step.id === currentStep;
            return (
              <React.Fragment key={step.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '11px',
                    background: done ? '#2563eb' : current ? '#0f172a' : 'white',
                    border: `2px solid ${done ? '#2563eb' : current ? '#0f172a' : '#e2e8f0'}`,
                    color: (done || current) ? 'white' : '#94a3b8',
                    transition: 'all 0.15s ease'
                  }}>
                    {step.id}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: current ? '#0f172a' : '#94a3b8' }}>
                    {step.title}
                  </span>
                </div>
                {step.id < STEPS.length && (
                  <ChevronRight style={{ width: '13px', height: '13px', color: '#cbd5e1' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <Alert variant="warning" style={{ fontSize: '12px', fontWeight: 600 }}>
          <AlertCircle style={{ width: '14px', height: '14px', marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
          {errorMsg}
        </Alert>
      )}

      {/* Main Wizard Form Card */}
      <Card style={{ border: '1px solid #e2e8f0', borderRadius: '14px', background: 'white' }}>
        <CardHeader style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <CardTitle style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
              Step {currentStep} of 6
            </span>
          </div>
          <CardDescription style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {currentStep === 1 && 'Select the loan category that matches your financing needs.'}
            {currentStep === 2 && 'Provide personal legal details as per official government registers.'}
            {currentStep === 3 && 'Document your occupation, business or student status details.'}
            {currentStep === 4 && 'Define loan parameters like principal value and term tenure.'}
            {currentStep === 5 && 'Upload high-resolution document files for verification desk review.'}
            {currentStep === 6 && 'Verify all information before submitting to credit review.'}
          </CardDescription>
        </CardHeader>

        <CardContent style={{ padding: '24px' }}>
          
          {/* STEP 1: Loan Type Select */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {LOAN_TYPES.map((type) => {
                  const isSelected = formValues.loanType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleSelectLoanType(type)}
                      style={{
                        textAlign: 'left', padding: '14px 16px', borderRadius: '10px',
                        border: `1px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                        background: isSelected ? '#eff6ff' : 'white',
                        boxShadow: isSelected ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ display: 'block', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{type.value} Loan</span>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>{type.description}</span>
                      
                      <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px', color: '#94a3b8' }}>
                        <span>Limit: <strong>₹{(type.minAmount / 100000).toFixed(1)}L - ₹{(type.maxAmount / 100000).toFixed(1)}L</strong></span>
                        <span>Rate: <strong>{type.interestRate}% Interest</strong></span>
                        <span>Term: <strong>{type.tenure}</strong></span>
                        <span>Time: <strong>{type.time}</strong></span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {formValues.loanType && (
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                  Selected Loan Category: <strong style={{ color: '#2563eb' }}>{formValues.loanType} Loan</strong>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Personal Details */}
          {currentStep === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={S.lbl}>Full Name (As on Aadhaar)</label>
                <Input type="text" placeholder="Full legal name" {...register('applicantDetails.fullName')} />
              </div>
              <div>
                <label style={S.lbl}>Date of Birth</label>
                <Input type="date" {...register('applicantDetails.dob')} />
              </div>
              <div>
                <label style={S.lbl}>Mobile Number</label>
                <Input type="tel" placeholder="Mobile phone" {...register('applicantDetails.phone')} />
              </div>
              <div>
                <label style={S.lbl}>Email Address</label>
                <Input type="email" placeholder="customer@loandesk.com" {...register('applicantDetails.email')} />
              </div>
              <div>
                <label style={S.lbl}>Aadhaar Number</label>
                <Input type="text" placeholder="12-digit number" {...register('applicantDetails.aadhaar')} />
              </div>
              <div>
                <label style={S.lbl}>PAN Number</label>
                <Input type="text" style={{ textTransform: 'uppercase' }} placeholder="ABCDE1234F" {...register('applicantDetails.pan')} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={S.lbl}>Residential Address</label>
                <Input type="text" placeholder="Complete address details" {...register('applicantDetails.address')} />
              </div>
            </div>
          )}

          {/* STEP 3: Employment Details */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={S.lbl}>Applicant Category</label>
                <Select value={applicantCategory} onChange={e => { setApplicantCategory(e.target.value); setErrorMsg(''); }}>
                  <option value="Salaried">Salaried</option>
                  <option value="Self Employed">Self Employed</option>
                  <option value="Student">Student</option>
                </Select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                {applicantCategory === 'Salaried' && (
                  <>
                    <div>
                      <label style={S.lbl}>Company Name</label>
                      <Input type="text" placeholder="Employer name" {...register('employmentDetails.employer')} />
                    </div>
                    <div>
                      <label style={S.lbl}>Monthly Income (INR)</label>
                      <Input type="number" placeholder="Net pay per month" {...register('employmentDetails.monthlyIncome')} />
                    </div>
                  </>
                )}

                {applicantCategory === 'Self Employed' && (
                  <>
                    <div>
                      <label style={S.lbl}>Business Name</label>
                      <Input type="text" placeholder="Firm or practice name" {...register('employmentDetails.businessName')} />
                    </div>
                    <div>
                      <label style={S.lbl}>Annual Income (INR)</label>
                      <Input type="number" placeholder="Net income per year" {...register('employmentDetails.annualIncome')} />
                    </div>
                  </>
                )}

                {applicantCategory === 'Student' && (
                  <>
                    <div>
                      <label style={S.lbl}>College Name</label>
                      <Input type="text" placeholder="Institution name" {...register('employmentDetails.collegeName')} />
                    </div>
                    <div>
                      <label style={S.lbl}>Guardian Income (INR)</label>
                      <Input type="number" placeholder="Co-applicant/Guardian annual income" {...register('employmentDetails.guardianIncome')} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Loan Requirements */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={S.lbl}>Requested Loan Amount (INR)</label>
                  <Input type="number" placeholder={`Limit: ₹${selectedLoan?.minAmount.toLocaleString()} - ₹${selectedLoan?.maxAmount.toLocaleString()}`} {...register('amount')} />
                </div>
                <div>
                  <label style={S.lbl}>Preferred Tenure (Months)</label>
                  <Input type="number" placeholder="Preferred term months" {...register('tenureMonths')} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={S.lbl}>Purpose of Loan</label>
                  <Textarea placeholder="Explain what the requested funds will be used for..." {...register('purpose')} />
                </div>
              </div>

              {formValues.amount && formValues.tenureMonths && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Calculations Summary
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div>
                      <span style={S.lbl}>Estimated EMI</span>
                      <strong style={{ fontSize: '15px', color: '#059669' }}>₹{emi.toLocaleString('en-IN')}/mo</strong>
                    </div>
                    <div>
                      <span style={S.lbl}>Interest Rate</span>
                      <strong style={{ fontSize: '15px', color: '#334155' }}>{rate}% Interest</strong>
                    </div>
                    <div>
                      <span style={S.lbl}>Processing Fee (1%)</span>
                      <strong style={{ fontSize: '15px', color: '#334155' }}>₹{processingFee.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={S.lbl}>Expected Approval</span>
                      <strong style={{ fontSize: '15px', color: '#2563eb' }}>{selectedLoan?.time}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Document Uploads */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
                {docs.map((doc) => {
                  const fileName = uploadedFiles[doc.key]?.name;
                  const state = uploadingStates[doc.key];

                  return (
                    <div key={doc.key} style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                          {doc.label} <span style={{ color: '#ef4444' }}>*</span>
                        </span>
                        <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{doc.desc}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                          {state === 'uploading' ? (
                            <span style={{ color: '#2563eb', fontWeight: 600 }}>Uploading...</span>
                          ) : state === 'success' && fileName ? (
                          <span style={{ color: '#475569', fontWeight: 600 }}>{fileName}</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>No File Selected</span>
                          )}
                        </span>
                        
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: '#0f172a', color: 'white', fontSize: '11px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer' }}>
                          <Upload style={{ width: '11px', height: '11px' }} />
                          {state === 'success' ? 'Replace File' : 'Upload'}
                          <input type="file" style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => handleFileChange(e, doc.key)} />
                        </label>
                      </div>

                      {/* Status indicator row (neutral color, no green badges, neutral success icon) */}
                      <div style={{ marginTop: '8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        {state === 'uploading' ? (
                          <>
                            <Loader2 style={{ width: '11.5px', height: '11.5px', color: '#2563eb', animation: 'spin 1s linear infinite' }} />
                            <span style={{ color: '#2563eb' }}>Uploading file...</span>
                          </>
                        ) : state === 'success' && fileName ? (
                          <>
                            <Info style={{ width: '12px', height: '12px', color: '#475569' }} />
                            <span style={{ color: '#475569' }}>Status: Uploaded Successfully</span>
                          </>
                        ) : (
                          <>
                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8' }} />
                            <span style={{ color: '#94a3b8' }}>Awaiting Upload</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Optional customer message */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Info style={{ width: '15px', height: '15px', color: '#64748b', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                  Your uploaded documents will be reviewed securely by our verification team after application submission. You will receive updates in My Applications and Notifications.
                </p>
              </div>
            </div>
          )}

          {/* STEP 6: Review & Submit */}
          {currentStep === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* 1. Personal Summary */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Personal Details
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                    <div><span style={S.lbl}>Full Name</span><span style={S.val}>{formValues.applicantDetails?.fullName}</span></div>
                    <div><span style={S.lbl}>DOB</span><span style={S.val}>{formValues.applicantDetails?.dob}</span></div>
                    <div><span style={S.lbl}>Mobile</span><span style={S.val}>{formValues.applicantDetails?.phone}</span></div>
                    <div><span style={S.lbl}>Email Address</span><span style={S.val}>{formValues.applicantDetails?.email}</span></div>
                    <div><span style={S.lbl}>Aadhaar Number</span><span style={{ ...S.val, fontFamily: 'monospace' }}>XXXX XXXX {formValues.applicantDetails?.aadhaar?.slice(-4)}</span></div>
                    <div><span style={S.lbl}>PAN Number</span><span style={{ ...S.val, fontFamily: 'monospace', textTransform: 'uppercase' }}>{formValues.applicantDetails?.pan}</span></div>
                    <div><span style={S.lbl}>Residential Address</span><span style={S.val}>{formValues.applicantDetails?.address}</span></div>
                  </div>
                </div>

                {/* 2. Employment Summary */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Employment Details
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                    <div><span style={S.lbl}>Category</span><span style={S.val}>{applicantCategory}</span></div>
                    {applicantCategory === 'Salaried' && (
                      <>
                        <div><span style={S.lbl}>Company Name</span><span style={S.val}>{formValues.employmentDetails?.employer}</span></div>
                        <div><span style={S.lbl}>Monthly Income</span><span style={S.val}>₹{Number(formValues.employmentDetails?.monthlyIncome).toLocaleString('en-IN')}</span></div>
                      </>
                    )}
                    {applicantCategory === 'Self Employed' && (
                      <>
                        <div><span style={S.lbl}>Business Name</span><span style={S.val}>{formValues.employmentDetails?.businessName}</span></div>
                        <div><span style={S.lbl}>Annual Income</span><span style={S.val}>₹{Number(formValues.employmentDetails?.annualIncome).toLocaleString('en-IN')}</span></div>
                      </>
                    )}
                    {applicantCategory === 'Student' && (
                      <>
                        <div><span style={S.lbl}>College Name</span><span style={S.val}>{formValues.employmentDetails?.collegeName}</span></div>
                        <div><span style={S.lbl}>Guardian Income</span><span style={S.val}>₹{Number(formValues.employmentDetails?.guardianIncome).toLocaleString('en-IN')}</span></div>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Loan Summary */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', gridColumn: 'span 2' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Loan Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '11px' }}>
                    <div><span style={S.lbl}>Requested Amount</span><strong style={{ fontSize: '14px', color: '#0f172a' }}>₹{Number(formValues.amount).toLocaleString('en-IN')}</strong></div>
                    <div><span style={S.lbl}>Loan Product</span><span style={S.val}>{formValues.loanType} Loan</span></div>
                    <div><span style={S.lbl}>Tenure Requested</span><span style={S.val}>{formValues.tenureMonths} Months</span></div>
                    <div><span style={S.lbl}>Purpose of Loan</span><span style={S.val}>{formValues.purpose}</span></div>
                    <div><span style={S.lbl}>Estimated EMI</span><strong style={{ fontSize: '14px', color: '#059669' }}>₹{emi.toLocaleString('en-IN')}/mo</strong></div>
                    <div><span style={S.lbl}>Interest Rate</span><span style={S.val}>{rate}% Interest</span></div>
                    <div><span style={S.lbl}>Processing Fee</span><span style={S.val}>₹{processingFee.toLocaleString('en-IN')}</span></div>
                    <div><span style={S.lbl}>Expected Approval</span><span style={S.val}>{selectedLoan?.time}</span></div>
                  </div>
                </div>

                {/* 4. Uploaded Documents List */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', gridColumn: 'span 2' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                    Uploaded Documents
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                    {docs.map(d => (
                      <div key={d.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>{d.label}</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '10px' }}>{uploadedFiles[d.key]?.name}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                            Uploaded
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Consent check */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formValues.consentDeclared}
                    onChange={e => setValue('consentDeclared', e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                    I confirm that the information provided is accurate.
                  </span>
                </label>
              </div>

            </div>
          )}

        </CardContent>

        <CardFooter style={{ borderTop: '1px solid #f1f5f9', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', background: '#fafafa' }}>
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            style={{ 
              display: currentStep === 1 ? 'none' : 'inline-flex',
              fontSize: '11px', fontWeight: 700, padding: '7px 14px' 
            }}
          >
            <ChevronLeft style={{ width: '13px', height: '13px', marginRight: '4px' }} />
            Previous
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              style={{ fontSize: '11px', fontWeight: 700, padding: '7px 14px', background: '#0f172a', color: 'white' }}
            >
              Next Step
              <ChevronRight style={{ width: '13px', height: '13px', marginLeft: '4px' }} />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit(onFormSubmit)}
              loading={applyLoanMutation.isPending}
              style={{ fontSize: '11px', fontWeight: 700, padding: '8px 18px', background: '#2563eb', color: 'white' }}
            >
              <Sparkles style={{ width: '13px', height: '13px', marginRight: '5px' }} />
              Submit Loan Application
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ApplyLoan;
