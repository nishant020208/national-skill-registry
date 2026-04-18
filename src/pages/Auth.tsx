import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); toast({ title: "Sign in failed", description: error.message, variant: "destructive" }); return; }
    // Wait for profile to be available before navigating to avoid the dashboard bouncing back to /auth.
    if (data.user) {
      for (let i = 0; i < 10; i++) {
        const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", data.user.id).maybeSingle();
        if (prof) break;
        await new Promise(r => setTimeout(r, 150));
      }
    }
    setLoading(false);
    navigate("/dashboard", { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { name } },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.includes("whitelisted") ? "This email is not authorized. Please contact your ITI admin." : error.message;
      toast({ title: "Sign up failed", description: msg, variant: "destructive" }); return;
    }
    toast({ title: "Welcome to NATIONAL SKILL REGISTRY", description: "Account created successfully." });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="gov-strip" />
      <div className="grid place-items-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="size-12 rounded-md bg-primary grid place-items-center mx-auto mb-3">
              <ShieldCheck className="size-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold">NATIONAL SKILL REGISTRY</h1>
            <p className="text-xs text-muted-foreground mt-1">Authorised access · Whitelisted users only</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                  <div><Label>Password</Label><Input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                  <Button className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div><Label>Full name</Label><Input required value={name} onChange={e => setName(e.target.value)} /></div>
                  <div><Label>Whitelisted email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                  <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
                  <Button className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
                  <p className="text-xs text-muted-foreground text-center">Role is auto-assigned from the whitelist.</p>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
