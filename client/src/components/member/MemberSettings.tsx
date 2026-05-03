import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Bell,
  DollarSign,
  Eye,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useAuthQuery';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';
import { updateSettingsApi } from '@/lib/api';
import { applyTheme, getStoredTheme, normalizeTheme, persistTheme, type Theme } from '@/lib/theme';
import MemberProfile from './MemberProfile';

const MemberSettings: React.FC = () => {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const liveLocation = useLocationBroadcast();

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>(
    () => getStoredTheme()
  );
  const [savingTheme, setSavingTheme] = useState(false);

  // Apply current theme on mount and on theme change
  useEffect(() => { applyTheme(theme); }, [theme]);


  // ── Currency ───────────────────────────────────────────────────────────────
  const [currency, setCurrency] = useState('USD');
  const [savingCurrency, setSavingCurrency] = useState(false);

  // ── Privacy ────────────────────────────────────────────────────────────────
  const [isProfileVisible, setIsProfileVisible] = useState<'public' | 'private'>('public');
  const [showEmail, setShowEmail] = useState(true);
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [showFamilyMembers, setShowFamilyMembers] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showBirthYear, setShowBirthYear] = useState(false);
  const [showMaritalStatus, setShowMaritalStatus] = useState(false);
  const [showSocialLinks, setShowSocialLinks] = useState(false);
  const [showWork, setShowWork] = useState(false);
  const [showMembership, setShowMembership] = useState(false);
  const [showActivityStatus, setShowActivityStatus] = useState(false);
  const [allowDirectMessage, setAllowDirectMessage] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // ── Notifications ────────────────────────────────────────────────────────
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [followUpsEmail, setFollowUpsEmail] = useState(true);
  const [followUpsInApp, setFollowUpsInApp] = useState(true);
  const [followUpsWhatsapp, setFollowUpsWhatsapp] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Hydrate from profile settings on load
  useEffect(() => {
    if (!profile?.settings) return;
    const s = profile.settings;
    if (s.currency) setCurrency(s.currency);
    if (s.appearance?.theme) {
      const nextTheme = normalizeTheme(s.appearance.theme);
      setTheme(nextTheme);
      persistTheme(nextTheme);
    }
    if (s.privacy) {
      const p = s.privacy;
      if (p.isProfileVisible) setIsProfileVisible(p.isProfileVisible);
      if (typeof p.showEmail === 'boolean') setShowEmail(p.showEmail);
      if (typeof p.showPhoneNumber === 'boolean') setShowPhoneNumber(p.showPhoneNumber);
      if (typeof p.showFamilyMembers === 'boolean') setShowFamilyMembers(p.showFamilyMembers);
      if (typeof p.showLocation === 'boolean') setShowLocation(p.showLocation);
      if (typeof p.showBirthYear === 'boolean') setShowBirthYear(p.showBirthYear);
      if (typeof p.showMaritalStatus === 'boolean') setShowMaritalStatus(p.showMaritalStatus);
      if (typeof p.showSocialLinks === 'boolean') setShowSocialLinks(p.showSocialLinks);
      if (typeof p.showWork === 'boolean') setShowWork(p.showWork);
      if (typeof p.showMembership === 'boolean') setShowMembership(p.showMembership);
      if (typeof p.showActivityStatus === 'boolean') setShowActivityStatus(p.showActivityStatus);
      if (typeof p.allowDirectMessage === 'boolean') setAllowDirectMessage(p.allowDirectMessage);
      if (typeof p.showOnlineStatus === 'boolean') setShowOnlineStatus(p.showOnlineStatus);
    }
    if (s.notifications) {
      const n = s.notifications;
      if (typeof n.email === 'boolean') setEmailNotifications(n.email);
      if (typeof n.push === 'boolean') setPushNotifications(n.push);
      if (typeof n.whatsapp === 'boolean') setWhatsappNotifications(n.whatsapp);
      if (typeof n.followUpsEmail === 'boolean') setFollowUpsEmail(n.followUpsEmail);
      if (typeof n.followUpsInApp === 'boolean') setFollowUpsInApp(n.followUpsInApp);
      if (typeof n.followUpsWhatsapp === 'boolean') setFollowUpsWhatsapp(n.followUpsWhatsapp);
    }
  }, [profile?.settings]);

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleApplyTheme = async () => {
    setSavingTheme(true);
    try {
      persistTheme(theme);
      await updateSettingsApi({ appearance: { theme } });
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      toast.success('Theme applied');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save theme');
    } finally {
      setSavingTheme(false);
    }
  };

  const handleSelectTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    persistTheme(nextTheme);
  };

  const handleSaveCurrency = async () => {
    setSavingCurrency(true);
    try {
      await updateSettingsApi({ currency });
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      toast.success('Currency preference saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save currency');
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSavingPrivacy(true);
    try {
      await updateSettingsApi({
        privacy: {
          isProfileVisible,
          showEmail,
          showPhoneNumber,
          showFamilyMembers,
          showLocation,
          showBirthYear,
          showMaritalStatus,
          showSocialLinks,
          showWork,
          showMembership,
          showActivityStatus,
          allowDirectMessage,
          showOnlineStatus,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      toast.success('Privacy settings saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save privacy settings');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleResetPrivacy = () => {
    setIsProfileVisible('public');
    setShowEmail(true);
    setShowPhoneNumber(false);
    setShowFamilyMembers(false);
    setShowLocation(false);
    setShowBirthYear(false);
    setShowMaritalStatus(false);
    setShowSocialLinks(false);
    setShowWork(false);
    setShowMembership(false);
    setShowActivityStatus(false);
    setAllowDirectMessage(true);
    setShowOnlineStatus(false);
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      await updateSettingsApi({
        notifications: {
          email: emailNotifications,
          push: pushNotifications,
          whatsapp: whatsappNotifications,
          followUpsEmail,
          followUpsInApp,
          followUpsWhatsapp,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      toast.success('Notification settings saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save notification settings');
    } finally {
      setSavingNotifications(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how the app looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium">Theme</Label>
            <p className="text-sm text-gray-600 mb-3">Choose your preferred theme</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  { key: 'light', label: 'Light', icon: Sun },
                  { key: 'dark', label: 'Dark', icon: Moon },
                  { key: 'system', label: 'System', icon: Monitor },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    theme === key
                      ? 'border-app-primary bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectTheme(key)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <div
                    className={`w-full h-8 border rounded flex overflow-hidden ${
                      key === 'dark' ? 'border-gray-700' : ''
                    }`}
                  >
                    {key === 'light' && (
                      <>
                        <div className="w-1/3 bg-gray-100" />
                        <div className="w-2/3 bg-white" />
                      </>
                    )}
                    {key === 'dark' && (
                      <>
                        <div className="w-1/3 bg-gray-700" />
                        <div className="w-2/3 bg-gray-800" />
                      </>
                    )}
                    {key === 'system' && (
                      <>
                        <div className="w-1/2 bg-white border-r" />
                        <div className="w-1/2 bg-gray-800" />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <Button onClick={handleApplyTheme} disabled={savingTheme} className="w-full sm:w-auto">
              {savingTheme && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply Theme
            </Button>
            <p className="text-sm text-gray-600">Changes will be applied immediately</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Live Location
            {liveLocation.isTracking && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-medium border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
                </span>
                Live
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Share your real-time GPS location with your branch admin. You can turn this off at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <Label className="text-base font-medium">Share live location</Label>
              <p className="text-sm text-gray-600">
                When on, your admin can see your live position on the Member Map. We never store your trail on our servers — it's wiped the moment you turn this off or close the app.
              </p>
              {liveLocation.lastPosition && (
                <p className="text-xs text-muted-foreground">
                  Last sent: {liveLocation.lastPosition.lat.toFixed(5)}, {liveLocation.lastPosition.lng.toFixed(5)}
                  {' '}±{Math.round(liveLocation.lastPosition.accuracy)}m
                </p>
              )}
              {!liveLocation.supported && (
                <p className="text-xs text-red-600">Geolocation is not supported on this device.</p>
              )}
              {liveLocation.error && (
                <p className="text-xs text-red-600">{liveLocation.error}</p>
              )}
            </div>
            <Switch
              checked={liveLocation.isTracking}
              disabled={!liveLocation.supported}
              onCheckedChange={() => liveLocation.toggle()}
              aria-label="Toggle live location sharing"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCurrencySettings = () => {
    const selected = currencies.find((c) => c.code === currency);
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency Settings
            </CardTitle>
            <CardDescription>
              Choose your preferred currency for all financial displays
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currency">Select Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm w-4">{curr.symbol}</span>
                        <span>
                          {curr.name} ({curr.code})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-sm">Preview</h4>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Tithe Amount', amount: '100.00' },
                  { label: 'Offering', amount: '50.00' },
                  { label: 'Event Fee', amount: '25.00' },
                ].map(({ label, amount }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-600">{label}:</span>
                    <span className="font-mono font-medium">
                      {selected?.symbol}
                      {amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleSaveCurrency}
                disabled={savingCurrency}
                className="w-full sm:w-auto"
              >
                {savingCurrency && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Currency
              </Button>
              <p className="text-sm text-gray-600 self-center">
                This affects all currency displays in the app
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Choose how you want to receive church and follow-up updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            {
              label: 'Email notifications',
              description: 'Allow Church Flow to send account and ministry emails.',
              icon: Mail,
              value: emailNotifications,
              onChange: setEmailNotifications,
            },
            {
              label: 'In-app notifications',
              description: 'Show unread notifications in the notification bell.',
              icon: Bell,
              value: pushNotifications,
              onChange: setPushNotifications,
            },
            {
              label: 'WhatsApp notifications',
              description: 'Allow WhatsApp delivery when a WhatsApp provider is configured.',
              icon: MessageCircle,
              value: whatsappNotifications,
              onChange: setWhatsappNotifications,
            },
          ].map(({ label, description, icon: Icon, value, onChange }) => (
            <div key={label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg">
              <div className="flex gap-3">
                <Icon className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">{label}</h4>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </div>
              <Switch checked={value} onCheckedChange={(v) => onChange(v)} />
            </div>
          ))}

          <div className="border rounded-lg p-4 space-y-4">
            <div>
              <h4 className="font-medium">Follow-up notifications</h4>
              <p className="text-sm text-gray-600">Used for assignments, overdue alerts, and high-priority reminders.</p>
            </div>
            <div className="grid gap-3">
              {[
                { label: 'Follow-up in-app alerts', value: followUpsInApp, onChange: setFollowUpsInApp },
                { label: 'Follow-up email alerts', value: followUpsEmail, onChange: setFollowUpsEmail },
                { label: 'Follow-up WhatsApp alerts', value: followUpsWhatsapp, onChange: setFollowUpsWhatsapp },
              ].map(({ label, value, onChange }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{label}</span>
                  <Switch checked={value} onCheckedChange={(v) => onChange(v)} />
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSaveNotifications} disabled={savingNotifications} className="w-full sm:w-auto">
            {savingNotifications && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Notification Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderDirectorySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Directory Privacy Settings
          </CardTitle>
          <CardDescription>
            Control what information is visible to other members in the directory
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile visibility */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Directory Visibility</h4>
              <p className="text-sm text-gray-600">
                Show your profile in the member directory
              </p>
            </div>
            <Switch
              checked={isProfileVisible === 'public'}
              onCheckedChange={(checked) =>
                setIsProfileVisible(checked ? 'public' : 'private')
              }
            />
          </div>

          {isProfileVisible === 'public' && (
            <div className="space-y-4 pl-4 border-l-2 border-gray-100">
              <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">
                Visible Information
              </h4>

              <div className="grid gap-4">
                {(
                  [
                    {
                      label: 'Email Address',
                      color: 'bg-red-500',
                      value: showEmail,
                      onChange: setShowEmail,
                    },
                    {
                      label: 'Phone Number',
                      color: 'bg-emerald-500',
                      value: showPhoneNumber,
                      onChange: setShowPhoneNumber,
                    },
                    {
                      label: 'Family Members',
                      color: 'bg-cyan-500',
                      value: showFamilyMembers,
                      onChange: setShowFamilyMembers,
                    },
                    {
                      label: 'Location / Address',
                      color: 'bg-purple-500',
                      value: showLocation,
                      onChange: setShowLocation,
                    },
                    {
                      label: 'Birth Year',
                      color: 'bg-indigo-500',
                      value: showBirthYear,
                      onChange: setShowBirthYear,
                    },
                    {
                      label: 'Marital Status',
                      color: 'bg-pink-500',
                      value: showMaritalStatus,
                      onChange: setShowMaritalStatus,
                    },
                    {
                      label: 'Social Links',
                      color: 'bg-sky-500',
                      value: showSocialLinks,
                      onChange: setShowSocialLinks,
                    },
                    {
                      label: 'Work Info',
                      color: 'bg-amber-500',
                      value: showWork,
                      onChange: setShowWork,
                    },
                    {
                      label: 'Membership Info',
                      color: 'bg-teal-500',
                      value: showMembership,
                      onChange: setShowMembership,
                    },
                    {
                      label: 'Activity Status',
                      color: 'bg-blue-500',
                      value: showActivityStatus,
                      onChange: setShowActivityStatus,
                    },
                    {
                      label: 'Allow Direct Messages',
                      color: 'bg-green-500',
                      value: allowDirectMessage,
                      onChange: setAllowDirectMessage,
                    },
                    {
                      label: 'Online Status',
                      color: 'bg-orange-500',
                      value: showOnlineStatus,
                      onChange: setShowOnlineStatus,
                    },
                  ] as const
                ).map(({ label, color, value, onChange }) => (
                  <div
                    key={label}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 ${color} rounded-full`} />
                      <span className="text-sm">{label}</span>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(v) => (onChange as (b: boolean) => void)(v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-1 text-sm">Privacy Note</h4>
            <p className="text-sm text-blue-800">
              Your name will always be visible in the directory. Church administrators can always
              view complete member information regardless of these settings.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleSavePrivacy}
              disabled={savingPrivacy}
              className="w-full sm:w-auto"
            >
              {savingPrivacy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Privacy Settings
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleResetPrivacy}
              disabled={savingPrivacy}
            >
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm md:text-base">Manage your account and app preferences</p>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="h-auto p-0 bg-transparent border-b border-gray-200 rounded-none w-full justify-start gap-0">
          <TabsTrigger value="account" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm font-medium">Account</TabsTrigger>
          <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm font-medium">General</TabsTrigger>
          <TabsTrigger value="currency" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm font-medium">Currency</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm font-medium">Notifications</TabsTrigger>
          <TabsTrigger value="privacy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm font-medium">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <MemberProfile embedded />
        </TabsContent>

        <TabsContent value="general">
          {renderGeneralSettings()}
        </TabsContent>

        <TabsContent value="currency">
          {renderCurrencySettings()}
        </TabsContent>

        <TabsContent value="notifications">
          {renderNotificationSettings()}
        </TabsContent>

        <TabsContent value="privacy">
          {renderDirectorySettings()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MemberSettings;
