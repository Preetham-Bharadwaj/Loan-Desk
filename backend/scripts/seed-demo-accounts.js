const { randomUUID } = require('crypto');
const { supabase } = require('../config/supabase');
const { syncDemoAuthUsers } = require('./sync-demo-auth-users');

const customers = [
  { full_name: 'Rahul Sharma', email: 'customer1@loandesk.com', mobile: '9000000001' },
  { full_name: 'Priya Nair', email: 'customer2@loandesk.com', mobile: '9000000002' },
  { full_name: 'Rajesh Kumar', email: 'customer3@loandesk.com', mobile: '9000000003' },
  { full_name: 'Sneha Patel', email: 'customer4@loandesk.com', mobile: '9000000004' },
];

const loanOfficers = [
  { full_name: 'Vikram Singh', email: 'officer1@loandesk.com', employee_id: 'LO-001' },
  { full_name: 'Ananya Rao', email: 'officer2@loandesk.com', employee_id: 'LO-002' },
  { full_name: 'Rahul Verma', email: 'officer3@loandesk.com', employee_id: 'LO-003' },
];

async function upsertEmployee(profile, employeeId) {
  const { data: existing, error: lookupError } = await supabase
    .from('employees')
    .select('employee_id, profile_id, designation, status')
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const payload = {
    employee_id: existing?.employee_id || employeeId,
    profile_id: profile.id,
    designation: 'loan_officer',
    status: 'active',
  };

  const { error } = existing
    ? await supabase.from('employees').update(payload).eq('profile_id', profile.id)
    : await supabase.from('employees').insert(payload);

  if (error) throw error;
}

async function seed() {
  for (const customer of customers) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customer.email)
      .maybeSingle();

    const payload = {
      id: existing?.id || randomUUID(),
      full_name: customer.full_name,
      email: customer.email,
      mobile: customer.mobile,
      role: 'customer',
    };

    const { error } = existing
      ? await supabase.from('profiles').update(payload).eq('id', existing.id)
      : await supabase.from('profiles').insert(payload);

    if (error) throw error;
  }

  for (const officer of loanOfficers) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', officer.email)
      .maybeSingle();

    const profilePayload = {
      id: existing?.id || randomUUID(),
      full_name: officer.full_name,
      email: officer.email,
      mobile: '',
      role: 'employee',
    };

    const { error: profileError } = existing
      ? await supabase.from('profiles').update(profilePayload).eq('id', existing.id)
      : await supabase.from('profiles').insert(profilePayload);

    if (profileError) throw profileError;

    await upsertEmployee(profilePayload, officer.employee_id);
  }

  await syncDemoAuthUsers();
  console.log('Seeded demo profiles and synced Supabase Auth users.');
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
