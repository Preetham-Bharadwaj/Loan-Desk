import React from 'react';

// ============================================================
// BUTTON
// ============================================================
export const Button = React.forwardRef(({
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  ...props
}, ref) => {
  const base = [
    'inline-flex items-center justify-center font-semibold rounded-lg',
    'transition-all duration-150 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'cursor-pointer select-none',
  ].join(' ');

  const variants = {
    primary:     'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 focus-visible:ring-slate-700 shadow-sm',
    secondary:   'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400 shadow-sm',
    outline:     'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 focus-visible:ring-slate-400',
    ghost:       'text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400',
    destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-sm',
    success:     'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500 shadow-sm',
    link:        'text-slate-900 underline-offset-4 hover:underline p-0 h-auto',
  };

  const sizes = {
    sm:   'h-8 px-3 text-xs gap-1.5',
    md:   'h-10 px-4 text-sm gap-2',
    lg:   'h-11 px-6 text-base gap-2',
    icon: 'h-10 w-10 p-0',
  };

  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
});
Button.displayName = 'Button';

// ============================================================
// CARD
// ============================================================
export const Card = ({ className = '', children, ...props }) => (
  <div
    className={`rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ className = '', children, ...props }) => (
  <div className={`flex flex-col space-y-1 px-6 py-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = '', as: Tag = 'h3', children, ...props }) => (
  <Tag
    className={`font-display text-base font-semibold leading-tight text-slate-900 ${className}`}
    {...props}
  >
    {children}
  </Tag>
);

export const CardDescription = ({ className = '', children, ...props }) => (
  <p className={`text-sm text-slate-500 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = '', children, ...props }) => (
  <div className={`px-6 pb-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = '', children, ...props }) => (
  <div className={`flex items-center px-6 py-4 border-t border-slate-100 bg-slate-50/50 ${className}`} {...props}>
    {children}
  </div>
);

// ============================================================
// FORM INPUTS
// ============================================================
export const Input = React.forwardRef(({ className = '', type = 'text', error, label, id, ...props }, ref) => (
  <div className="w-full space-y-1">
    {label && <label htmlFor={id} className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>}
    <input
      id={id}
      type={type}
      ref={ref}
      className={[
        'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900',
        'placeholder:text-slate-400',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
          : 'border-slate-200 focus:border-slate-400 focus:ring-slate-200',
        className,
      ].join(' ')}
      {...props}
    />
    {error && <p className="text-xs text-red-500 font-medium">{error.message || error}</p>}
  </div>
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef(({ className = '', error, label, id, rows = 3, ...props }, ref) => (
  <div className="w-full space-y-1">
    {label && <label htmlFor={id} className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>}
    <textarea
      id={id}
      ref={ref}
      rows={rows}
      className={[
        'flex w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900',
        'placeholder:text-slate-400 resize-none',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
          : 'border-slate-200 focus:border-slate-400 focus:ring-slate-200',
        className,
      ].join(' ')}
      {...props}
    />
    {error && <p className="text-xs text-red-500 font-medium">{error.message || error}</p>}
  </div>
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef(({ className = '', error, label, id, children, options = [], ...props }, ref) => (
  <div className="w-full space-y-1">
    {label && <label htmlFor={id} className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>}
    <select
      id={id}
      ref={ref}
      className={[
        'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
          : 'border-slate-200 focus:border-slate-400 focus:ring-slate-200',
        className,
      ].join(' ')}
      {...props}
    >
      {children ?? options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-500 font-medium">{error.message || error}</p>}
  </div>
));
Select.displayName = 'Select';

// ============================================================
// BADGE — maps semantic status to color
// ============================================================
const STATUS_STYLES = {
  // Loan workflow stages — new simplified display labels
  'In Review':                       'bg-amber-50 text-amber-700 border border-amber-200',
  'On Hold':                         'bg-orange-50 text-orange-700 border border-orange-200',
  'Approved':                        'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Rejected':                        'bg-red-50 text-red-700 border border-red-200',
  'Submitted':                       'bg-blue-50 text-blue-700 border border-blue-200',
  // Legacy aliases kept so old badge references still render with a colour
  'Automated Verification':          'bg-amber-50 text-amber-700 border border-amber-200',
  'Verification Queue':              'bg-amber-50 text-amber-700 border border-amber-200',
  'Verification In Progress':        'bg-amber-50 text-amber-700 border border-amber-200',
  'Credit Queue':                    'bg-amber-50 text-amber-700 border border-amber-200',
  'Credit In Progress':              'bg-amber-50 text-amber-700 border border-amber-200',
  'Approvals Queue':                 'bg-amber-50 text-amber-700 border border-amber-200',
  'Additional Documents Required':   'bg-orange-50 text-orange-700 border border-orange-200',
  'Document Requested':              'bg-orange-50 text-orange-700 border border-orange-200',
  // Risk
  'Low':    'bg-emerald-100 text-emerald-800',
  'Medium': 'bg-amber-100 text-amber-800',
  'High':   'bg-red-100 text-red-800',
  // Roles
  'Loan Officer':         'bg-sky-100 text-sky-800',
  'Verification Officer': 'bg-amber-100 text-amber-800',
  'Credit Officer':       'bg-purple-100 text-purple-800',
  'Loan Manager':         'bg-sky-100 text-sky-800',
  'Administrator':        'bg-rose-100 text-rose-800',
};

export const Badge = ({ className = '', status = '', children, ...props }) => {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${style} ${className}`}
      {...props}
    >
      {children ?? status}
    </span>
  );
};

// ============================================================
// ALERT
// ============================================================
const ALERT_STYLES = {
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
};

export const Alert = ({ className = '', variant = 'info', children, ...props }) => (
  <div
    role="alert"
    className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${ALERT_STYLES[variant] ?? ALERT_STYLES.info} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// ============================================================
// TABLE
// ============================================================
export const Table = ({ className = '', children, ...props }) => (
  <div className="w-full overflow-x-auto">
    <table className={`w-full text-sm ${className}`} {...props}>{children}</table>
  </div>
);

export const TableHeader = ({ className = '', children, ...props }) => (
  <thead className={`border-b border-slate-200 bg-slate-50 ${className}`} {...props}>{children}</thead>
);

export const TableBody = ({ className = '', children, ...props }) => (
  <tbody className={`divide-y divide-slate-100 ${className}`} {...props}>{children}</tbody>
);

export const TableRow = ({ className = '', children, ...props }) => (
  <tr className={`transition-colors hover:bg-slate-50/60 ${className}`} {...props}>{children}</tr>
);

export const TableHead = ({ className = '', children, ...props }) => (
  <th
    className={`h-10 px-4 text-left align-middle text-xs font-semibold text-slate-500 uppercase tracking-wide ${className}`}
    {...props}
  >
    {children}
  </th>
);

export const TableCell = ({ className = '', children, ...props }) => (
  <td className={`px-4 py-3.5 align-middle text-slate-700 ${className}`} {...props}>{children}</td>
);

// ============================================================
// STAT CARD — reusable KPI metric widget
// ============================================================
export const StatCard = ({ title, value, icon: Icon, iconColor = 'text-slate-400', description, trend, className = '' }) => (
  <Card className={`hover:shadow-md transition-shadow duration-200 ${className}`}>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{title}</p>
          <p className="mt-2 text-2xl font-bold font-display text-slate-900 truncate">{value}</p>
          {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
        </div>
        {Icon && (
          <div className={`ml-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100 ${iconColor} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

// ============================================================
// PAGE HEADER
// ============================================================
export const PageHeader = ({ title, description, action, className = '' }) => (
  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
    <div>
      <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// ============================================================
// EMPTY STATE
// ============================================================
export const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
    {Icon && (
      <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <Icon className="w-7 h-7" />
      </div>
    )}
    {title && <h3 className="text-sm font-semibold text-slate-800 mb-1">{title}</h3>}
    {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

// ============================================================
// SPINNER
// ============================================================
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <svg
      className={`animate-spin text-slate-600 ${sizes[size] ?? sizes.md} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
};

// ============================================================
// LOADING PAGE
// ============================================================
export const LoadingPage = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center min-h-64 gap-4">
    <Spinner size="lg" />
    <p className="text-sm font-medium text-slate-500">{message}</p>
  </div>
);
