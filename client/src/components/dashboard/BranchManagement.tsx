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
  Plus,
  MapPin,
  Trash2,
  Building,
} from 'lucide-react';
import { getBranchesByChurch, createBranch, deleteBranch } from '@/lib/church';
import { useChurch } from '@/components/church/ChurchProvider';
import type { Branch } from '@/types/church';

const BranchManagement: React.FC = () => {
  const { currentChurch, refreshChurches } = useChurch();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
  });

  const loadBranches = () => {
    if (currentChurch) {
      setBranches(getBranchesByChurch(currentChurch.id));
    }
  };

  useEffect(() => {
    loadBranches();
  }, [currentChurch]);

  const handleCreate = () => {
    if (!newBranch.name.trim() || !currentChurch) return;
    createBranch({
      churchId: currentChurch.id,
      name: newBranch.name,
      address: newBranch.address,
      city: newBranch.city,
      state: newBranch.state,
      country: newBranch.country,
      isHeadquarters: false,
    });
    setNewBranch({ name: '', address: '', city: '', state: '', country: '' });
    setIsCreateOpen(false);
    loadBranches();
    refreshChurches();
  };

  const handleDelete = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch?.isHeadquarters) {
      alert('Cannot delete the headquarters branch.');
      return;
    }
    if (confirm('Are you sure you want to delete this branch?')) {
      deleteBranch(branchId);
      loadBranches();
      refreshChurches();
    }
  };

  if (!currentChurch) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-gray-500">Please select a church first.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Branches</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage locations for {currentChurch.name}
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="branchName">Branch Name *</Label>
                <Input
                  id="branchName"
                  placeholder="e.g. Lagos Branch"
                  value={newBranch.name}
                  onChange={e => setNewBranch(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="branchAddress">Address</Label>
                <Input
                  id="branchAddress"
                  placeholder="Street address"
                  value={newBranch.address}
                  onChange={e => setNewBranch(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="branchCity">City</Label>
                  <Input
                    id="branchCity"
                    placeholder="City"
                    value={newBranch.city}
                    onChange={e => setNewBranch(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="branchState">State</Label>
                  <Input
                    id="branchState"
                    placeholder="State"
                    value={newBranch.state}
                    onChange={e => setNewBranch(prev => ({ ...prev, state: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="branchCountry">Country</Label>
                <Input
                  id="branchCountry"
                  placeholder="Country"
                  value={newBranch.country}
                  onChange={e => setNewBranch(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!newBranch.name.trim()}>
                Create Branch
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Branch List */}
      <div className="space-y-3">
        {branches.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No branches yet</p>
              <p className="text-sm">Add a branch location for your church</p>
            </CardContent>
          </Card>
        ) : (
          branches.map(branch => (
            <Card key={branch.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                        {branch.isHeadquarters && (
                          <Badge variant="secondary" className="text-xs">HQ</Badge>
                        )}
                      </div>
                      {(branch.address || branch.city || branch.state || branch.country) && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {[branch.address, branch.city, branch.state, branch.country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {!branch.isHeadquarters && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(branch.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default BranchManagement;
