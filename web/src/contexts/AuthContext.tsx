import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, UserRole } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile | null;
    } catch (err) {
      console.error('Profile fetch error:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      
      // If profile doesn't exist but user does, try to create it
      if (!profileData && user) {
        console.log('Profile not found for user, attempting to create...');
        console.log('User metadata:', user.user_metadata);
        
        // Check if user is authenticated (has a session)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          // User is authenticated, try to create profile
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              role: user.user_metadata?.role || 'client',
            });
          
          if (createError) {
            if (createError.code === '23505' || createError.message.includes('duplicate')) {
              // Profile already exists (created by trigger), fetch it
              console.log('Profile already exists, fetching...');
              const newProfile = await fetchProfile(user.id);
              setProfile(newProfile);
            } else if (createError.code === '42501') {
              // RLS policy violation - profile should be created by database trigger
              console.log('RLS policy violation - profile should be created by database trigger');
              console.log('If profile still missing, run FIX_EXISTING_USERS.sql in Supabase SQL Editor');
            } else {
              console.error('Failed to auto-create profile:', createError);
            }
          } else {
            console.log('Profile auto-created successfully');
            // Fetch again
            const newProfile = await fetchProfile(user.id);
            setProfile(newProfile);
          }
        } else {
          console.log('User not authenticated yet - profile should be created by database trigger');
        }
      }
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then((profileData) => {
          setProfile(profileData);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      console.log('Starting signup process for:', email, 'role:', role);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role,
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        return { error };
      }

      if (!data.user) {
        console.error('No user returned from signup');
        return { error: new Error('Failed to create user account') };
      }

      console.log('User created, ID:', data.user.id);
      
      // Check if we have a session (user is authenticated)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.user) {
        // User is authenticated, try to create profile
        console.log('User is authenticated, creating profile...');
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            role: role,
          })
          .select()
          .single();

        if (profileError) {
          console.error('Error creating profile:', profileError);
          
          // If profile already exists (from trigger), that's fine
          if (profileError.code === '23505' || profileError.message.includes('duplicate')) {
            console.log('Profile already exists (likely created by database trigger)');
          } else if (profileError.code === '42501') {
            // RLS policy violation - profile will be created by database trigger instead
            console.log('RLS policy violation - profile will be created by database trigger');
          } else {
            console.error('Unexpected profile error:', profileError);
            // Don't fail signup - profile will be created by trigger or on next login
          }
        } else {
          console.log('Profile created successfully:', profileData);
        }
      } else {
        // User is not authenticated yet (email confirmation required)
        // Profile will be created by database trigger or when user confirms email
        console.log('User not authenticated yet - profile will be created by database trigger');
      }

      // Wait a moment for trigger to run, then refresh profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshProfile();

      return { error: null };
    } catch (err) {
      console.error('Signup exception:', err);
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
