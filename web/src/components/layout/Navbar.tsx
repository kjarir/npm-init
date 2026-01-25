import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();

  const getNavLinks = () => {
    // If user is logged in, show role-specific links
    if (user && profile) {
      if (profile.role === 'client') {
        return [
          { name: "Dashboard", href: "/client/dashboard" },
          { name: "Browse Freelancers", href: "/client/freelancers" },
          { name: "Wallet", href: "/wallet" },
        ];
      } else if (profile.role === 'freelancer') {
        return [
          { name: "Dashboard", href: "/freelancer/dashboard" },
          { name: "Browse Projects", href: "/freelancer/projects" },
          { name: "Wallet", href: "/wallet" },
        ];
      }
    }

    // If not logged in, show informational links
    return [
      { name: "For Clients", href: "/client/dashboard" },
      { name: "For Freelancers", href: "/freelancer/dashboard" },
      { name: "Wallet", href: "/wallet" },
    ];
  };

  const navLinks = getNavLinks();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (profile?.role === 'client') return '/client/dashboard';
    if (profile?.role === 'freelancer') return '/freelancer/dashboard';
    return '/';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b-3 border-foreground">
      <div className="container-editorial">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary border-3 border-foreground brutal-shadow-sm flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-xl">B</span>
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">BobPay</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6 overflow-x-auto">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`font-display text-xs lg:text-sm uppercase tracking-wider hover:text-accent transition-colors whitespace-nowrap flex-shrink-0 ${
                  location.pathname === link.href || 
                  (link.href === '/#how-it-works' && location.pathname === '/')
                    ? 'text-accent font-bold' 
                    : ''
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* CTA Buttons / User Menu */}
          <div className="hidden md:flex items-center gap-4">
            {!loading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User size={16} />
                    {profile?.full_name || user.email?.split('@')[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/wallet')}>
                    Wallet
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/#how-it-works')}>
                    How It Works
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/chat')}>
                    Messages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/disputes')}>
                    Disputes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut size={16} className="mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/auth">Log In</Link>
                </Button>
                <Button variant="accent" size="sm" asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-6 border-t-3 border-foreground animate-slide-up">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="font-display text-lg uppercase tracking-wider py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex gap-4 pt-4">
                {!loading && user ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to={getDashboardLink()} onClick={() => setIsOpen(false)}>
                        Dashboard
                      </Link>
                    </Button>
                    <Button 
                      variant="accent" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        handleSignOut();
                        setIsOpen(false);
                      }}
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>Log In</Link>
                    </Button>
                    <Button variant="accent" size="sm" className="flex-1" asChild>
                      <Link to="/auth" onClick={() => setIsOpen(false)}>Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
