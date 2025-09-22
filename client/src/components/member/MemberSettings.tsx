import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Monitor, 
  Sun, 
  Moon, 
  DollarSign, 
  Eye, 
  EyeOff,
  Key,
  Lock
} from 'lucide-react';

interface MemberSettingsProps {
  settingType: 'general' | 'password' | 'currency' | 'directory';
}

const MemberSettings: React.FC<MemberSettingsProps> = ({ settingType }) => {
  const [theme, setTheme] = useState('light');
  const [currency, setCurrency] = useState('USD');
  const [directoryVisible, setDirectoryVisible] = useState(true);
  const [photoVisible, setPhotoVisible] = useState(true);
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [addressVisible, setAddressVisible] = useState(false);
  const [birthdayVisible, setBirthdayVisible] = useState(false);
  const [emailVisible, setEmailVisible] = useState(true);
  const [maritalStatusVisible, setMaritalStatusVisible] = useState(false);

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' }
  ];

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
              <div 
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setTheme('light')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="h-4 w-4" />
                  <span className="font-medium">Light</span>
                </div>
                <div className="w-full h-8 bg-white border rounded flex">
                  <div className="w-1/3 bg-gray-100 rounded-l"></div>
                  <div className="w-2/3 bg-white rounded-r"></div>
                </div>
              </div>
              
              <div 
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setTheme('dark')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-4 w-4" />
                  <span className="font-medium">Dark</span>
                </div>
                <div className="w-full h-8 bg-gray-800 border border-gray-700 rounded flex">
                  <div className="w-1/3 bg-gray-700 rounded-l"></div>
                  <div className="w-2/3 bg-gray-800 rounded-r"></div>
                </div>
              </div>
              
              <div 
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  theme === 'system' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setTheme('system')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-4 w-4" />
                  <span className="font-medium">System</span>
                </div>
                <div className="w-full h-8 border rounded flex">
                  <div className="w-1/2 bg-white border-r"></div>
                  <div className="w-1/2 bg-gray-800"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
            <Button className="w-full sm:w-auto">Apply Theme</Button>
            <p className="text-sm text-gray-600">Changes will be applied immediately</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPasswordSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password for security</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input 
                  id="currentPassword" 
                  type="password" 
                  placeholder="Enter your current password"
                  className="pr-10"
                />
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input 
                  id="newPassword" 
                  type="password" 
                  placeholder="Enter your new password"
                  className="pr-10"
                />
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-600">
                Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Confirm your new password"
                  className="pr-10"
                />
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <Separator />
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" className="w-full sm:w-auto">
                Update Password
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  const renderCurrencySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Settings
          </CardTitle>
          <CardDescription>Choose your preferred currency for all financial displays</CardDescription>
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
                      <span className="font-mono text-sm">{curr.symbol}</span>
                      <span>{curr.name} ({curr.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Preview</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Tithe Amount:</span>
                <span className="font-mono">{currencies.find(c => c.code === currency)?.symbol}100.00</span>
              </div>
              <div className="flex justify-between">
                <span>Offering:</span>
                <span className="font-mono">{currencies.find(c => c.code === currency)?.symbol}50.00</span>
              </div>
              <div className="flex justify-between">
                <span>Event Fee:</span>
                <span className="font-mono">{currencies.find(c => c.code === currency)?.symbol}25.00</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button className="w-full sm:w-auto">
              Save Currency
            </Button>
            <p className="text-sm text-gray-600 self-center">
              This will affect all currency displays in the app
            </p>
          </div>
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
          <CardDescription>Control what information is visible to other members in the directory</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Directory Visibility</h4>
              <p className="text-sm text-gray-600">Show your profile in the member directory</p>
            </div>
            <Switch 
              checked={directoryVisible} 
              onCheckedChange={setDirectoryVisible}
            />
          </div>
          
          {directoryVisible && (
            <div className="space-y-4 pl-4 border-l-2 border-gray-100">
              <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">Visible Information</h4>
              
              <div className="grid gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Profile Photo</span>
                  </div>
                  <Switch 
                    checked={photoVisible} 
                    onCheckedChange={setPhotoVisible}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Mobile Phone</span>
                  </div>
                  <Switch 
                    checked={phoneVisible} 
                    onCheckedChange={setPhoneVisible}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm">Address</span>
                  </div>
                  <Switch 
                    checked={addressVisible} 
                    onCheckedChange={setAddressVisible}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">Birthday</span>
                  </div>
                  <Switch 
                    checked={birthdayVisible} 
                    onCheckedChange={setBirthdayVisible}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Email Address</span>
                  </div>
                  <Switch 
                    checked={emailVisible} 
                    onCheckedChange={setEmailVisible}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                    <span className="text-sm">Marital Status</span>
                  </div>
                  <Switch 
                    checked={maritalStatusVisible} 
                    onCheckedChange={setMaritalStatusVisible}
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Privacy Note</h4>
            <p className="text-sm text-blue-800">
              Your name will always be visible in the directory. These settings only control additional information visibility.
              Church administrators can always view complete member information regardless of these settings.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button className="w-full sm:w-auto">
              Save Privacy Settings
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const getTitle = () => {
    switch (settingType) {
      case 'general': return 'General Settings';
      case 'password': return 'Change Password';
      case 'currency': return 'Currency Settings';
      case 'directory': return 'Directory Settings';
      default: return 'Settings';
    }
  };

  const getDescription = () => {
    switch (settingType) {
      case 'general': return 'Customize your app appearance and preferences';
      case 'password': return 'Update your account security credentials';
      case 'currency': return 'Set your preferred currency for financial displays';
      case 'directory': return 'Control your privacy in the member directory';
      default: return 'Manage your account settings';
    }
  };

  const renderContent = () => {
    switch (settingType) {
      case 'general': return renderGeneralSettings();
      case 'password': return renderPasswordSettings();
      case 'currency': return renderCurrencySettings();
      case 'directory': return renderDirectorySettings();
      default: return renderGeneralSettings();
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{getTitle()}</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            {getDescription()}
          </p>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default MemberSettings;