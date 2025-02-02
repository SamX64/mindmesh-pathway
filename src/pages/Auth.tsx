import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/auth/AuthForm";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (formData: {
    email: string;
    password: string;
    confirmPassword?: string;
    username?: string;
    fullName?: string;
  }, isLogin: boolean) => {
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) throw signInError;

        // After sign in, verify the profile exists
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("No user found after login");
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          throw new Error("Failed to verify user profile");
        }

        if (!profile) {
          throw new Error("Profile not found. Please contact support.");
        }

        navigate("/dashboard");
      } else {
        // Sign up flow
        try {
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                username: formData.username,
                full_name: formData.fullName,
              },
            },
          });

          if (signUpError) throw signUpError;

          if (authData.user) {
            // Wait for the profile trigger to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Create initial onboarding status
            const { error: onboardingError } = await supabase
              .from('onboarding_status')
              .insert([
                { 
                  user_id: authData.user.id,
                  is_completed: false,
                  created_at: new Date().toISOString()
                }
              ]);

            if (onboardingError) {
              console.error("Error creating onboarding status:", onboardingError);
              throw new Error("Failed to initialize onboarding");
            }

            toast({
              title: "Success",
              description: "Account created successfully! Please check your email to verify your account.",
            });
            
            navigate("/onboarding");
          }
        } catch (error: any) {
          // Check if the error is due to user already existing
          if (error.message?.includes("User already registered") || 
              error.message?.toLowerCase()?.includes("already exists")) {
            toast({
              title: "Account Exists",
              description: "An account with this email already exists. Please sign in instead.",
              variant: "destructive",
            });
            return;
          }
          throw error; // Re-throw other errors to be caught by outer catch block
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during authentication",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 animate-fade-up glass rounded-lg">
        <AuthForm onSubmit={handleAuth} loading={loading} />
      </div>
    </div>
  );
};

export default Auth;