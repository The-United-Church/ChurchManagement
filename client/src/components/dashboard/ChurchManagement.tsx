import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Church,
  Plus,
  Search,
  Users,
  MapPin,
  Trash2,
  Edit,
  Building,
} from 'lucide-react';
import { getChurches, createChurch, deleteChurch } from '@/lib/church';
import { getChurchMembers } from '@/lib/auth';
import { getBranchesByChurch } from '@/lib/church';
import { useAuth } from '@/components/auth/AuthProvider';
import { useChurch } from '@/components/church/ChurchProvider';
import type { Church as ChurchType } from '@/types/church';

const ChurchManagement: React.FC = () => {
  const { user } = useAuth();
  const { refreshChurches } = useChurch();
  const [churches, setChurches] = useState<ChurchType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChurch, setNewChurch] = useState({ name: '', description: '' });

  const loadChurches = () => {
    setChurches(getChurches());
  };

  useEffect(() => {
    loadChurches();
  }, []);

  const handleCreate = () => {
    if (!newChurch.name.trim() || !user) return;
    createChurch({
      name: newChurch.name,
      description: newChurch.description,
      createdBy: user.id,
    });
    setNewChurch({ name: '', description: '' });
    setIsCreateOpen(false);
    loadChurches();
    refreshChurches();
  };

  const handleDelete = (churchId: string) => {
    if (confirm('Are you sure you want to delete this church? This will remove all branches and member associations.')) {
      deleteChurch(churchId);
      loadChurches();
      refreshChurches();
    }
  };

  const filtered = churches.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Churches</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage all registered churches on the platform
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Church
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Church</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="churchName">Church Name *</Label>
                <Input
                  id="churchName"
                  placeholder="e.g. Salvation Ministry"
                  value={newChurch.name}
                  onChange={e => setNewChurch(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="churchDesc">Description</Label>
                <Input
                  id="churchDesc"
                  placeholder="A brief description..."
                  value={newChurch.description}
                  onChange={e => setNewChurch(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!newChurch.name.trim()}>
                Create Church
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-10"
          placeholder="Search churches..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{churches.length}</p>
              <p className="text-xs text-gray-500">Total Churches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {churches.reduce((sum, c) => sum + getBranchesByChurch(c.id).length, 0)}
              </p>
              <p className="text-xs text-gray-500">Total Branches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {churches.reduce((sum, c) => sum + getChurchMembers(c.id).length, 0)}
              </p>
              <p className="text-xs text-gray-500">Total Members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Church List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Church className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No churches found</p>
              <p className="text-sm">Create a new church to get started</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(church => {
            const memberCount = getChurchMembers(church.id).length;
            const branchCount = getBranchesByChurch(church.id).length;
            return (
              <Card key={church.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Church className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{church.name}</h3>
                        {church.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{church.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Users className="h-3 w-3" /> {memberCount} members
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" /> {branchCount} branches
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(church.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChurchManagement;
