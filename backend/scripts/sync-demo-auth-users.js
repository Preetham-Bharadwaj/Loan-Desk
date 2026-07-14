const { supabase } = require('../config/supabase');

const PAGE_SIZE = 1000;

function getDemoPassword() {
  const password = process.env.DEMO_SHARED_PASSWORD || process.env.VITE_DEMO_SHARED_PASSWORD;
  if (!password) {
    throw new Error('DEMO_SHARED_PASSWORD or VITE_DEMO_SHARED_PASSWORD is required.');
  }
  return password;
}

async function listAuthUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;

    const pageUsers = data?.users || [];
    users.push(...pageUsers);

    if (pageUsers.length < PAGE_SIZE) return users;
    page += 1;
  }
}

async function syncDemoAuthUsers() {
  const demoPassword = getDemoPassword();
  const [{ data: profiles, error: profileError }, authUsers] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, role')
      .in('role', ['customer', 'employee'])
      .eq('is_active', true)
      .not('email', 'is', null)
      .order('full_name', { ascending: true }),
    listAuthUsers(),
  ]);

  if (profileError) throw profileError;

  const authUserByEmail = new Map(
    authUsers
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user])
  );

  let created = 0;
  let updated = 0;

  for (const profile of profiles || []) {
    const email = String(profile.email || '').trim().toLowerCase();
    if (!email) continue;

    const userMetadata = {
      profile_id: String(profile.id),
      role: profile.role,
    };
    const existingUser = authUserByEmail.get(email);
    const result = existingUser
      ? await supabase.auth.admin.updateUserById(existingUser.id, {
          password: demoPassword,
          email_confirm: true,
          user_metadata: { ...existingUser.user_metadata, ...userMetadata },
        })
      : await supabase.auth.admin.createUser({
          email,
          password: demoPassword,
          email_confirm: true,
          user_metadata: userMetadata,
        });

    if (result.error) throw result.error;

    if (existingUser) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  console.log(`Demo Auth sync complete: ${created} created, ${updated} updated.`);
}

if (require.main === module) {
  syncDemoAuthUsers().catch((error) => {
    console.error('Demo Auth sync failed:', error);
    process.exit(1);
  });
}

module.exports = { syncDemoAuthUsers };
