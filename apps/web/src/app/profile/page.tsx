'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import MainLayout from '@/components/layout/MainLayout';
import { Edit2, Check, X, ChevronDown, HelpCircle } from 'feather-icons-react';
import { useOnboardingTasks } from '@/hooks/useOnboardingTasks';

// Add role definitions
const ROLE_DEFINITIONS = [
  {
    id: 'product_manager',
    title: 'Product Manager',
    description: 'Product Managers use Seena to get quick insight to shape their roadmap.'
  },
  {
    id: 'founder',
    title: 'Founder',
    description: 'Founders use Seena to unearth deep customer insights that shape their vision.'
  },
  {
    id: 'ux_researcher',
    title: 'UX Research',
    description: 'UX Researchers use Seena to 10X their workflows.'
  },
  {
    id: 'designer',
    title: 'Designer',
    description: 'Designers use Seena to validate design ideas with authentic user feedback.'
  },
  {
    id: 'marketer',
    title: 'Marketer',
    description: 'Marketers use Seena to tap into real customer narratives lighting fast.'
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Let Seena unlock insights that drive your decisions.'
  }
];

// Add avatar options
const AVATAR_OPTIONS = [
  { id: 'initial', label: 'Use Initial' },
  { id: 'paint', label: 'Paint', src: '/avatars/paint.png' },
  { id: 'felt-black', label: 'Felt Black', src: '/avatars/felt-black.png' },
  { id: 'lemon', label: 'Lemon', src: '/avatars/lemon.png' },
  { id: 'science-pink', label: 'Science Pink', src: '/avatars/science-pink.png' },
  { id: 'tron', label: 'Tron', src: '/avatars/tron.png' },
  { id: 'basketball', label: 'Basketball', src: '/avatars/basketball.png' },
  { id: 'dust-white', label: 'Dust White', src: '/avatars/dust-white.png' },
  { id: 'newyork', label: 'New York', src: '/avatars/newyork.png' },
  { id: 'grass', label: 'Grass', src: '/avatars/grass.png' },
  { id: 'liquid-black', label: 'Liquid Black', src: '/avatars/liquid-black.png' },
  { id: 'water', label: 'Water', src: '/avatars/water.png' },
  { id: 'liquid-white', label: 'Liquid White', src: '/avatars/liquid-white.png' },
  { id: 'tennis', label: 'Tennis', src: '/avatars/tennis.png' },
  { id: 'science-orange', label: 'Science Orange', src: '/avatars/science-orange.png' },
  { id: 'wave-white', label: 'Wave White', src: '/avatars/wave-white.png' },
  { id: 'gummybear', label: 'Gummy Bear', src: '/avatars/gummybear.png' },
  { id: 'sun', label: 'Sun', src: '/avatars/sun.png' },
  { id: 'cottoncandy', label: 'Cotton Candy', src: '/avatars/cottoncandy.png' },
  { id: 'dust-silver', label: 'Dust Silver', src: '/avatars/dust-silver.png' },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const { markTaskComplete } = useOnboardingTasks();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [profile, setProfile] = useState<{
    avatar_url: string;
    company: string;
    role: string;
    bio: string;
  }>({
    avatar_url: '',
    company: '',
    role: '',
    bio: '',
  });
  
  // State for editing fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [nameValue, setNameValue] = useState('');
  const [companyValue, setCompanyValue] = useState('');
  const [contextValue, setContextValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  useEffect(() => {
    console.log('ProfilePage useEffect triggered, user:', user);
    if (user && user.id) {
      getProfile();
    }
  }, [user?.id]);

  // Add click outside handler for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function getProfile() {
    console.log('getProfile called, user:', user);
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, company, role, bio')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        const profileData = {
          avatar_url: data.avatar_url || '',
          company: data.company || '',
          role: data.role || '',
          bio: data.bio || '',
        };
        setProfile(profileData);
        
        // Check profile completion on load
        const isComplete = checkProfileCompletion(profileData);
        console.log('Profile completion status on load:', isComplete);
        await updateProfileCompletionStatus(isComplete);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setMessage({ type: 'error', text: 'Error loading profile' });
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Error updating profile' });
    } finally {
      setUpdating(false);
    }
  }

  // Function to check if profile is complete
  const checkProfileCompletion = (profileData: any) => {
    const isComplete = !!(
      user?.user_metadata?.display_name &&
      profileData.company &&
      profileData.role &&
      profileData.bio
    );
    console.log('Profile completion check:', {
      display_name: !!user?.user_metadata?.display_name,
      company: !!profileData.company,
      role: !!profileData.role,
      bio: !!profileData.bio,
      isComplete
    });
    return isComplete;
  };

  // Function to update profile completion status
  const updateProfileCompletionStatus = async (isComplete: boolean) => {
    try {
      console.log('Updating profile completion status:', isComplete);
      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { profile_complete: isComplete }
      });
      
      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        throw metadataError;
      }
      
      if (isComplete) {
        await markTaskComplete('complete_profile');
      }
    } catch (error) {
      console.error('Error updating profile completion status:', error);
    }
  };

  // Function to handle field editing
  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    if (field === 'account') {
      setEditValue(value);
    } else if (field === 'context') {
      setCompanyValue(profile.company || '');
      setContextValue(profile.bio || '');
    }
  };

  // Function to save edited field
  const saveEdit = async () => {
    if (!editingField) return;
    
    try {
      setUpdating(true);
      
      if (editingField === 'email') {
        // Email change requires special handling with Supabase
        const { error } = await supabase.auth.updateUser({ email: editValue });
        if (error) throw error;
      } else if (editingField === 'display_name') {
        // Update user metadata with the new display name
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { display_name: nameValue }
        });
        
        if (metadataError) throw metadataError;
        
        // Check and update profile completion status
        const isComplete = checkProfileCompletion(profile);
        await updateProfileCompletionStatus(isComplete);
      } else if (editingField === 'account') {
        // Handle account updates (email and name)
        if (editValue !== user?.email) {
          const { error } = await supabase.auth.updateUser({ email: editValue });
          if (error) throw error;
        }
        if (nameValue !== user?.user_metadata?.display_name) {
          const { error: metadataError } = await supabase.auth.updateUser({
            data: { display_name: nameValue }
          });
          if (metadataError) throw metadataError;
          
          // Check and update profile completion status
          const isComplete = checkProfileCompletion(profile);
          await updateProfileCompletionStatus(isComplete);
        }
      } else if (editingField === 'context') {
        // Handle context updates (company and bio)
        const updates: { company?: string; bio?: string } = {};
        
        if (companyValue !== profile.company) {
          updates.company = companyValue;
        }
        if (contextValue !== profile.bio) {
          updates.bio = contextValue;
        }
        
        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user?.id);
          
          if (error) throw error;
          const updatedProfile = { ...profile, ...updates };
          setProfile(updatedProfile);
          
          // Check and update profile completion status
          const isComplete = checkProfileCompletion(updatedProfile);
          await updateProfileCompletionStatus(isComplete);
        }
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Error updating profile' });
    } finally {
      setUpdating(false);
      setEditingField(null);
    }
  };

  // Function to cancel editing
  const cancelEdit = () => {
    setEditingField(null);
  };

  // Function to handle avatar selection
  const handleAvatarSelect = async (avatarId: string) => {
    try {
      setUpdating(true);
      let avatarUrl = '';
      
      if (avatarId === 'initial') {
        // Use initial as avatar
        avatarUrl = '';
      } else {
        // Use selected avatar image
        avatarUrl = AVATAR_OPTIONS.find(opt => opt.id === avatarId)?.src || '';
      }
      
      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user?.id);
      
      if (updateError) throw updateError;
      
      // Update local state
      setProfile({ ...profile, avatar_url: avatarUrl });
      setSelectedAvatar(avatarId);
      setShowAvatarPicker(false);
      setMessage({ type: 'success', text: 'Avatar updated successfully!' });
    } catch (error) {
      console.error('Error updating avatar:', error);
      setMessage({ type: 'error', text: 'Error updating avatar' });
    } finally {
      setUpdating(false);
    }
  };

  // Update avatar when name changes
  useEffect(() => {
    if (profile.avatar_url === '' && user?.user_metadata?.display_name) {
      // If using initial avatar and name changes, update the display
      setProfile(prev => ({ ...prev }));
    }
  }, [user?.user_metadata?.display_name]);

  // Function to trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Function to handle password reset
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    try {
      setUpdating(true);
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/profile`,
      });
      
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password reset email sent!' });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setMessage({ type: 'error', text: 'Error sending password reset email' });
    } finally {
      setUpdating(false);
    }
  };

  // Update role selection handler
  const handleRoleSelect = async (roleId: string) => {
    const role = ROLE_DEFINITIONS.find(r => r.id === roleId);
    if (!role) return;

    setSelectedRole(roleId);
    setIsRoleDropdownOpen(false);

    if (roleId === 'other') {
      setEditingField('role');
      setEditValue('');
    } else {
      try {
        setUpdating(true);
        const { error } = await supabase
          .from('profiles')
          .update({ role: role.title })
          .eq('id', user?.id);

        if (error) throw error;
        setProfile(prev => ({ ...prev, role: role.title }));
        setMessage({ type: 'success', text: 'Role updated successfully!' });
      } catch (error) {
        console.error('Error updating role:', error);
        setMessage({ type: 'error', text: 'Error updating role' });
      } finally {
        setUpdating(false);
      }
    }
  };

  // Add function to get current role description
  const getCurrentRoleDescription = () => {
    if (selectedRole) {
      return ROLE_DEFINITIONS.find(r => r.id === selectedRole)?.description;
    }
    if (profile.role) {
      const role = ROLE_DEFINITIONS.find(r => r.title === profile.role);
      return role?.description;
    }
    return null;
  };

  // Check profile completion on initial load
  useEffect(() => {
    if (profile.avatar_url) {
      const isComplete = checkProfileCompletion(profile);
      updateProfileCompletionStatus(isComplete);
    }
  }, [profile]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Profile</h1>
          
          {/* Skeleton loader for Account Details card */}
          <div className="bg-white rounded-lg border border-gray-300 p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Account Details</h2>
              <div className="animate-pulse">
                <div className="h-6 w-6 bg-gray-200 rounded"></div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Avatar skeleton */}
              <div className="flex items-center gap-4">
                <div className="animate-pulse">
                  <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              
              {/* Name field skeleton */}
              <div>
                <div className="animate-pulse mb-2">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              
              {/* Email field skeleton */}
              <div>
                <div className="animate-pulse mb-2">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Skeleton loader for Context card */}
          <div className="bg-white rounded-lg border border-gray-300 p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Context</h2>
              <div className="animate-pulse">
                <div className="h-6 w-6 bg-gray-200 rounded"></div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Company field skeleton */}
              <div>
                <div className="animate-pulse mb-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              
              {/* Role field skeleton */}
              <div>
                <div className="animate-pulse mb-2">
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              
              {/* Context field skeleton */}
              <div>
                <div className="animate-pulse mb-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Skeleton loader for Onboarding Tasks */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="animate-pulse">
                      <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Profile</h1>
        
        {message && (
          <div className={`p-4 mb-6 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Account Details Card */}
        <div className="bg-white rounded-lg border border-gray-300 p-6 mb-8 relative">
          <button 
            onClick={() => {
              setEditingField('account');
              setEditValue(user?.email || '');
              setNameValue(user?.user_metadata?.display_name || '');
            }}
            className="absolute top-6 right-6 text-gray-400 hover:text-orange-500"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <h2 className="text-xl font-semibold mb-6">Account Details</h2>
          
          <div className="flex items-start gap-6">
            {/* Avatar Section */}
            <div>
              <div className="flex flex-col items-center">
                <div 
                  className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-medium relative cursor-pointer"
                  onClick={() => setShowAvatarPicker(true)}
                >
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    user?.user_metadata?.display_name?.[0].toUpperCase() || user?.email?.[0].toUpperCase() || 'U'
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Edit2 className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* User Details Section */}
            <div className="flex-1 space-y-4">
              {/* Email Field */}
              <div className="flex items-center">
                <div className="w-1/3 text-sm font-medium text-gray-500">Email</div>
                <div className="flex-1">
                  {editingField === 'account' ? (
                    <input
                      type="email"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="glass-input"
                      placeholder="Enter your email"
                    />
                  ) : (
                    <span className="text-gray-700">{user?.email}</span>
                  )}
                </div>
              </div>
              
              {/* Name Field */}
              <div className="flex items-center">
                <div className="w-1/3 text-sm font-medium text-gray-500">Name</div>
                <div className="flex-1">
                  {editingField === 'account' ? (
                    <input
                      type="text"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="glass-input"
                      placeholder="Enter your name"
                    />
                  ) : (
                    <span className="text-gray-700">{user?.user_metadata?.display_name || 'Not set'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          {editingField === 'account' && (
            <div className="flex justify-end mt-6 space-x-4">
              <button
                onClick={() => setEditingField(null)}
                className="btn-secondary"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="btn-primary"
                disabled={updating}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Context Card */}
        <div className="bg-white rounded-lg border border-gray-300 p-6 mb-8 relative">
          <button 
            onClick={() => {
              setEditingField('context');
              setCompanyValue(profile.company || '');
              setContextValue(profile.bio || '');
            }}
            className="absolute top-6 right-6 text-gray-400 hover:text-orange-500"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <h2 className="text-xl font-semibold mb-6">About You</h2>
          
          <div className="space-y-4">
            {/* Company Field */}
            <div className="flex items-center">
              <div className="w-1/3 text-sm font-medium text-gray-500">Company</div>
              <div className="flex-1">
                {editingField === 'context' ? (
                  <input
                    type="text"
                    value={companyValue}
                    onChange={(e) => setCompanyValue(e.target.value)}
                    className="glass-input"
                    placeholder="Enter your company"
                  />
                ) : (
                  <span className="text-gray-700">{profile.company || 'Not set'}</span>
                )}
              </div>
            </div>

            {/* Role Field */}
            <div className="flex items-start">
              <div className="w-1/3 text-sm font-medium text-gray-500 pt-1">Role</div>
              <div className="flex-1">
                <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 space-y-3 relative">
                  <div className="relative" ref={roleDropdownRef}>
                    <button
                      onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                      className="glass-select"
                    >
                      <span className="text-gray-700">
                        {profile.role || 'Role'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </button>
                    
                    {isRoleDropdownOpen && (
                      <div className="absolute z-[100] w-full mt-1 glass-dropdown">
                        {ROLE_DEFINITIONS.map((role) => (
                          <button
                            key={role.id}
                            onClick={() => handleRoleSelect(role.id)}
                            className="glass-dropdown-item"
                          >
                            {role.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {getCurrentRoleDescription() && (
                    <p className="text-sm text-gray-500 font-mono">
                      {getCurrentRoleDescription()}
                    </p>
                  )}
                  {selectedRole === 'other' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="glass-input"
                        placeholder="Enter your custom role"
                      />
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={saveEdit}
                          className="text-green-500 hover:text-green-600"
                          disabled={updating}
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingField(null);
                            setSelectedRole(null);
                          }}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio Field */}
            <div className="flex items-start">
              <div className="w-1/3 text-sm font-medium text-gray-500 pt-1 flex items-center gap-2">
                Context
                <div className="relative group">
                  <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-black text-white rounded-lg shadow-lg text-xs hidden group-hover:block">
                    This context can help the Seena agents understand how best to help you create, run, and analyze studies.
                  </div>
                </div>
              </div>
              <div className="flex-1">
                {editingField === 'context' ? (
                  <textarea
                    value={contextValue}
                    onChange={(e) => setContextValue(e.target.value)}
                    className="w-full min-h-[100px] rounded-md glass-input relative z-0"
                    placeholder="Tell us about your work and what kind of insights you're looking for..."
                  />
                ) : (
                  <span className="text-gray-700 whitespace-pre-wrap">{profile.bio || 'Not set'}</span>
                )}
              </div>
            </div>
          </div>
          {editingField === 'context' && (
            <div className="flex justify-end mt-6 space-x-4">
              <button
                onClick={() => setEditingField(null)}
                className="btn-secondary"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="btn-primary"
                disabled={updating}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Account Details Card */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <h2 className="text-xl font-semibold mb-6">Account Details</h2>
          
          <div className="space-y-6">
            {/* Subscription Tier */}
            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-500">Subscription Tier</div>
                <div className="text-sm font-mono text-orange-500">Free</div>
              </div>
            </div>

            {/* Credits */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-500">Credits</div>
                <div className="text-sm font-mono text-orange-500">Unlimited / Unlimited</div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Avatar Picker Modal */}
        {showAvatarPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Choose Avatar</h3>
                <button
                  onClick={() => setShowAvatarPicker(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                {AVATAR_OPTIONS.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => handleAvatarSelect(avatar.id)}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      selectedAvatar === avatar.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-200'
                    }`}
                  >
                    {avatar.id === 'initial' ? (
                      <div className="w-full aspect-square rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-medium">
                        {user?.user_metadata?.display_name?.[0].toUpperCase() || user?.email?.[0].toUpperCase() || 'U'}
                      </div>
                    ) : (
                      <img
                        src={avatar.src}
                        alt={avatar.label}
                        className="w-full aspect-square rounded-full object-cover"
                      />
                    )}
                    <p className="text-sm text-center mt-2 text-gray-600">{avatar.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 