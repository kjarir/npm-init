// Utility function to create profiles for existing users who don't have one
// Run this in the browser console if you have users without profiles

import { supabase } from '@/lib/supabase';

export async function createProfilesForExistingUsers() {
  try {
    console.log('Fetching all auth users...');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Not authenticated:', authError);
      return { error: 'Not authenticated' };
    }

    console.log('Current user:', user.id, user.email);

    // Check if profile exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error('Error checking profile:', profileCheckError);
      return { error: profileCheckError };
    }

    if (existingProfile) {
      console.log('Profile already exists:', existingProfile);
      return { success: true, message: 'Profile already exists', profile: existingProfile };
    }

    // Create profile
    console.log('Creating profile for user:', user.id);
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: user.user_metadata?.role || 'client',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      return { error: createError };
    }

    console.log('Profile created successfully:', newProfile);
    return { success: true, profile: newProfile };
  } catch (error: any) {
    console.error('Exception:', error);
    return { error };
  }
}

// Function to create profiles for multiple users (admin function)
export async function createProfilesForAllUsers() {
  console.log('This function requires admin access to auth.users table.');
  console.log('Please run this SQL in Supabase SQL Editor instead:');
  console.log(`
    -- Create profiles for all users who don't have one
    INSERT INTO public.profiles (id, email, full_name, role)
    SELECT 
      au.id,
      au.email,
      COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
      COALESCE((au.raw_user_meta_data->>'role')::user_role, 'client'::user_role) as role
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL;
  `);
}
