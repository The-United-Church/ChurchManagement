import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Church,
  ChevronDown,
  Check,
  Plus,
  MapPin,
} from 'lucide-react';
import { useChurch } from '@/components/church/ChurchProvider';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';

const ChurchSelector: React.FC = () => {
  const { myBranches, currentBranch, selectBranchGlobal, effectiveRole, isMembershipsReady } = useChurch();
  const { user, isLoading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Ensure a default branch is auto-selected after login without refresh
  useEffect(() => {
    console.log("ChurchSelector useEffect: user, isMembershipsReady, myBranches", user, isMembershipsReady, myBranches);
    if (!user) return;
    if (!isMembershipsReady) return;
    if (!currentBranch && myBranches && myBranches.length > 0) {
      // Prefer previously saved selection if any; otherwise first membership
      const savedId = localStorage.getItem('church_mgmt_selected_branch');
      const target = myBranches.find(b => b.id === savedId) || myBranches[0];
      // Fire and forget — ChurchProvider will sync church/branches accordingly
      selectBranchGlobal(target);
    }
  }, [user?.id, isMembershipsReady, myBranches?.length]);

  // Super admin without branches falls through to the general empty-branches state

  // If profile/auth is still loading, show a lightweight placeholder
  if (!user || authLoading || !isMembershipsReady) {
    // If there's no authenticated user, don't render the selector at all
    if (!user) return null;
    return (
      <div className="p-3 border-b border-gray-200 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gray-200 rounded-lg" />
          <div className="flex-1 min-w-0">
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-1" />
            <div className="h-2 bg-gray-100 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  // If user has no branches memberships
  if (!myBranches || myBranches.length === 0) {
    return (
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Church className="h-4 w-4" />
          <span>No branch assigned</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200">
      {/* Current Branch Display (no denomination shown) */}
      <button
        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Church className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {currentBranch ? currentBranch.name : myBranches[0]?.name ?? 'Select Branch'}
          </p>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
            {effectiveRole}
          </Badge>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="border-t border-gray-100 bg-gray-50">
          {/* Branch Selector across all memberships */}
          <div className="p-2">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-2 mb-1">
              Your Branches
            </p>
            {myBranches.map((branch) => (
              <button
                key={branch.id}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  currentBranch?.id === branch.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={async () => {
                  await selectBranchGlobal(branch);
                  setIsOpen(false);
                }}
              >
                <MapPin className="h-3 w-3" />
                <span className="flex-1 text-left truncate">{branch.name}</span>
                {branch.is_headquarters && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">HQ</Badge>
                )}
                {currentBranch?.id === branch.id && (
                  <Check className="h-3.5 w-3.5 text-blue-600" />
                )}
              </button>
            ))}
          </div>

          {/* Manage Churches link for super admin */}
          {effectiveRole === 'super_admin' && (
            <div className="p-2 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => {
                  navigate('/churches');
                  setIsOpen(false);
                }}
              >
                <Plus className="h-3 w-3 mr-2" />
                Manage All Churches
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChurchSelector;
