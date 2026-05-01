import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { changePasswordApi, updateSettingsApi } from '@/lib/api';
import { useProfile } from '@/hooks/useAuthQuery';

export function SecurityTab() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const is2FAEnabled = Boolean((profile as any)?.settings?.security?.['2fa']);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [saving2FA, setSaving2FA] = useState(false);

  const handleToggle2FA = async () => {
    setSaving2FA(true);
    try {
      await updateSettingsApi({ security: { '2fa': !is2FAEnabled } });
      await queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      toast.success(is2FAEnabled ? '2FA disabled' : '2FA enabled');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update 2FA setting';
      toast.error(message);
    } finally {
      setSaving2FA(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await changePasswordApi({ oldPassword: currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className={`h-5 w-5 ${is2FAEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  {is2FAEnabled ? 'Currently enabled — a code will be emailed on each login' : 'Currently disabled'}
                </p>
              </div>
            </div>
            <Button
              className="w-full sm:w-auto"
              variant={is2FAEnabled ? 'outline' : 'default'}
              onClick={handleToggle2FA}
              disabled={saving2FA}
            >
              {saving2FA && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handlePasswordChange}>
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input id="currentPassword" type={showCurrentPw ? 'text' : 'password'} placeholder="Enter your current password" className="pr-10" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowCurrentPw((v) => !v)} tabIndex={-1}>
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input id="newPassword" type={showNewPw ? 'text' : 'password'} placeholder="At least 8 characters" className="pr-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowNewPw((v) => !v)} tabIndex={-1}>
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showConfirmPw ? 'text' : 'password'} placeholder="Confirm your new password" className="pr-10" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowConfirmPw((v) => !v)} tabIndex={-1}>
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>
            <Separator />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={savingPassword}>
                {savingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
