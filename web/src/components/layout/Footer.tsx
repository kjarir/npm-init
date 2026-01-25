import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground border-t-3 border-foreground">
      <div className="container-editorial py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-accent border-3 border-primary-foreground flex items-center justify-center">
                <span className="text-accent-foreground font-display font-bold text-xl">B</span>
              </div>
              <span className="font-display font-bold text-2xl tracking-tight">BobPay</span>
            </div>
            <p className="text-primary-foreground/70 font-body">
              The fair work marketplace. Milestones, locked funds, automatic payments.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-widest mb-6">Product</h4>
            <ul className="space-y-3">
              <li><Link to="/#how-it-works" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">How It Works</Link></li>
              <li><Link to="/#milestones" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Milestones</Link></li>
              <li><Link to="/#verification" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">AI Verification</Link></li>
              <li><Link to="/#reputation" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Reputation</Link></li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-widest mb-6">Platform</h4>
            <ul className="space-y-3">
              <li><Link to="/client/dashboard" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">For Clients</Link></li>
              <li><Link to="/freelancer/dashboard" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">For Freelancers</Link></li>
              <li><Link to="/wallet" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Wallet</Link></li>
              <li><Link to="/disputes" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Disputes</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-widest mb-6">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">About</a></li>
              <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Careers</a></li>
              <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/50 text-sm">
            © 2024 BobPay. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-primary-foreground/50 hover:text-primary-foreground text-sm transition-colors">Privacy</a>
            <a href="#" className="text-primary-foreground/50 hover:text-primary-foreground text-sm transition-colors">Terms</a>
            <a href="#" className="text-primary-foreground/50 hover:text-primary-foreground text-sm transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
