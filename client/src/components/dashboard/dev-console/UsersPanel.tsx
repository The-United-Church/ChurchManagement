import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { DisplayUser } from './types';

interface UsersPanelProps {
  users: DisplayUser[];
  loading?: boolean;
}

const UsersPanel: React.FC<UsersPanelProps> = ({ users, loading }) => {
  const [search, setSearch] = useState('');

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or role…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" /></TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                </TableRow>
              ) : null}
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || '—'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{user.role || '—'}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'} className="text-[11px]">
                      {user.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.joinDate ? format(new Date(user.joinDate), 'PP') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPanel;
