'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { PageHeader, PageContainer } from '@/components/layout/PageHeader';
import {
  Button,
  Card,
  Badge,
  Input,
  Label,
  Textarea,
  Spinner,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  LabeledSwitch,
  SimpleSelect,
} from '@/components/ui';
import { PasswordInput } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/lib/utils';
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  Lock,
  Save,
  Camera,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  branch?: string;
  avatar?: string;
  bio?: string;
  joinedAt: string;
  lastLogin: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      jobUpdates: boolean;
      systemAlerts: boolean;
      marketing: boolean;
    };
  };
  twoFactorEnabled: boolean;
  sessions: {
    id: string;
    device: string;
    location: string;
    lastActive: string;
    current: boolean;
  }[];
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Form states
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    sms: true,
    push: true,
    jobUpdates: true,
    systemAlerts: true,
    marketing: false,
  });

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock profile data
      const mockProfile: UserProfile = {
        id: 'u1',
        firstName: 'James',
        lastName: 'Mwangi',
        email: 'james.mwangi@sparklecarwash.co.ke',
        phone: '+254 712 345 678',
        role: 'admin',
        branch: 'Nairobi Main',
        bio: 'System administrator and operations manager. Been with Sparkle Car Wash since 2020.',
        joinedAt: '2020-03-15T10:00:00Z',
        lastLogin: '2024-02-18T14:30:00Z',
        preferences: {
          theme: 'system',
          language: 'en',
          notifications: {
            email: true,
            sms: true,
            push: true,
            jobUpdates: true,
            systemAlerts: true,
            marketing: false,
          },
        },
        twoFactorEnabled: false,
        sessions: [
          {
            id: 's1',
            device: 'Chrome on Windows',
            location: 'Nairobi, Kenya',
            lastActive: '2024-02-18T14:30:00Z',
            current: true,
          },
          {
            id: 's2',
            device: 'Safari on iPhone',
            location: 'Nairobi, Kenya',
            lastActive: '2024-02-17T18:45:00Z',
            current: false,
          },
        ],
      };

      setProfile(mockProfile);
      setProfileForm({
        firstName: mockProfile.firstName,
        lastName: mockProfile.lastName,
        email: mockProfile.email,
        phone: mockProfile.phone,
        bio: mockProfile.bio || '',
      });
      setNotificationPrefs(mockProfile.preferences.notifications);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // API call would go here
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // API call would go here
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // API call would go here
    } catch (error) {
      console.error('Error saving notifications:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    try {
      // API call would go here
      fetchProfile();
    } catch (error) {
      console.error('Error logging out session:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'cashier':
        return 'bg-green-100 text-green-800';
      case 'attendant':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-96">
            <Spinner size="lg" />
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader title="Profile Settings" description="Manage your account settings and preferences" />

        {/* Profile Header */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.firstName}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {profile.firstName[0]}
                    {profile.lastName[0]}
                  </span>
                )}
              </div>
              <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90">
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">
                  {profile.firstName} {profile.lastName}
                </h2>
                <Badge className={getRoleBadgeColor(profile.role)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {profile.phone}
                </div>
                {profile.branch && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.branch}
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {formatDate(profile.joinedAt)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last login {formatDate(profile.lastLogin, true)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="general">
              <User className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={profileForm.firstName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={profileForm.lastName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Bio</Label>
                  <Textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    placeholder="Tell us a little about yourself..."
                    rows={3}
                  />
                </div>

                <Separator />

                <h3 className="font-semibold text-lg mb-4">Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Theme</Label>
                    <SimpleSelect
                      value={profile.preferences.theme}
                      onValueChange={() => {}}
                      options={[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'system', label: 'System Default' },
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Language</Label>
                    <SimpleSelect
                      value={profile.preferences.language}
                      onValueChange={() => {}}
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'sw', label: 'Swahili' },
                      ]}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="space-y-6">
              {/* Change Password */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Change Password</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label>Current Password</Label>
                    <PasswordInput
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <Label>New Password</Label>
                    <PasswordInput
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label>Confirm New Password</Label>
                    <PasswordInput
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      placeholder="Confirm new password"
                    />
                  </div>

                  {passwordError && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="flex items-center gap-2 text-success text-sm">
                      <Check className="h-4 w-4" />
                      Password changed successfully
                    </div>
                  )}

                  <Button
                    onClick={handleChangePassword}
                    disabled={
                      isSaving ||
                      !passwordForm.currentPassword ||
                      !passwordForm.newPassword ||
                      !passwordForm.confirmPassword
                    }
                  >
                    {isSaving ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Changing...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                </div>
              </Card>

              {/* Two-Factor Authentication */}
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Badge variant={profile.twoFactorEnabled ? 'success' : 'secondary'}>
                    {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <Button variant="outline">
                  {profile.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </Card>

              {/* Active Sessions */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Active Sessions</h3>
                <div className="space-y-4">
                  {profile.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{session.device}</span>
                          {session.current && (
                            <Badge variant="success" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {session.location} • Last active {formatDate(session.lastActive, true)}
                        </div>
                      </div>
                      {!session.current && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLogoutSession(session.id)}
                        >
                          Sign Out
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Notification Preferences</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Notification Channels</h4>
                  <div className="space-y-4">
                    <LabeledSwitch
                      label="Email Notifications"
                      description="Receive notifications via email"
                      checked={notificationPrefs.email}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, email: checked })
                      }
                    />
                    <LabeledSwitch
                      label="SMS Notifications"
                      description="Receive notifications via SMS"
                      checked={notificationPrefs.sms}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, sms: checked })
                      }
                    />
                    <LabeledSwitch
                      label="Push Notifications"
                      description="Receive push notifications in browser"
                      checked={notificationPrefs.push}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, push: checked })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-4">Notification Types</h4>
                  <div className="space-y-4">
                    <LabeledSwitch
                      label="Job Updates"
                      description="Get notified about job status changes"
                      checked={notificationPrefs.jobUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, jobUpdates: checked })
                      }
                    />
                    <LabeledSwitch
                      label="System Alerts"
                      description="Important system notifications and alerts"
                      checked={notificationPrefs.systemAlerts}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, systemAlerts: checked })
                      }
                    />
                    <LabeledSwitch
                      label="Marketing & Promotions"
                      description="News about features and promotional offers"
                      checked={notificationPrefs.marketing}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs({ ...notificationPrefs, marketing: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveNotifications} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </MainLayout>
  );
}
