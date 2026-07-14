import React, { useMemo } from 'react';
import { useEmployees } from '../../hooks/useLoans';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, LoadingPage } from '../../components/ui/Primitives';
import { Users as UsersIcon, ShieldCheck } from 'lucide-react';

const Users = () => {
  const { data: employees = [], isLoading } = useEmployees();

  const staff = useMemo(
    () => employees.map((employee) => ({
      id: employee.employeeId || employee.id,
      name: employee.fullName || employee.name,
      email: employee.email,
      role: employee.designation || employee.role || 'Employee',
      status: employee.status || 'Active',
    })),
    [employees]
  );

  if (isLoading) return <LoadingPage message="Loading staff directory..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 flex items-center">
          <UsersIcon className="w-6 h-6 mr-2 text-slate-700" /> Staff Management
        </h1>
        <p className="text-sm text-slate-500">Live directory sourced from profiles and employees tables.</p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold">Registered Staff Directory</CardTitle>
          <CardDescription className="text-xs">Manage active user accounts and role definitions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Staff Name</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Access Privilege Role</TableHead>
                <TableHead>System Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-slate-500 text-sm">
                    No staff records found.
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs text-slate-900">{user.id}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{user.name}</TableCell>
                    <TableCell className="text-xs text-slate-500">{user.email}</TableCell>
                    <TableCell>
                      <Badge status={user.role}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center text-xs text-emerald-600 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {user.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
