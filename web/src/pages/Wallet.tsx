import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Lock, CheckCircle, Clock, Shield, ExternalLink, Plus, RefreshCw, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DepositDialog } from "@/components/dialogs/DepositDialog";
import { WithdrawalDialog } from "@/components/dialogs/WithdrawalDialog";
import { useWallet, useTransactions } from "@/hooks/useWallet";
import { bobcoin, escrow } from "@/lib/blockchain";
import { useMyProjects } from "@/hooks/useProjects";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useFabric } from "@/components/blockchain/FabricConnectionProvider";

const Wallet = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  
  // Get Fabric connection status - wait for connection before querying!
  const { isConnected: fabricConnected, isConnecting: fabricConnecting } = useFabric();
  
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useWallet();
  const { data: transactions = [], refetch: refetchTransactions } = useTransactions(5);
  const { data: myProjects = [], refetch: refetchMyProjects } = useMyProjects();

  // Get REAL BobCoin balance from blockchain (not dummy!)
  // IMPORTANT: Only query when Fabric is connected!
  const { data: bobcoinBalance = "0", isLoading: bobcoinLoading } = useQuery({
    queryKey: ['bobcoin-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return "0";
      
      // Wait for Fabric connection if not connected yet
      if (!fabricConnected && !fabricConnecting) {
        console.warn('⚠️ Fabric not connected yet, returning 0');
        return "0";
      }
      
      try {
        console.log('📊 Fetching REAL BobCoin balance from blockchain for user:', user.id);
        console.log('🔌 Fabric connected:', fabricConnected);
        const balance = await bobcoin.balanceOf(user.id);
        console.log('✅ BobCoin balance from blockchain:', balance);
        return balance || "0";
      } catch (error: any) {
        console.error('❌ Error fetching BobCoin balance from blockchain:', error);
        // Return 0 on error - don't block the UI
        return "0";
      }
    },
    enabled: !!user?.id, // Always enabled if user exists
    refetchInterval: fabricConnected ? 5000 : false, // Only refetch when connected
    retry: 1, // Only retry once to avoid blocking
    retryDelay: 500, // Quick retry
    staleTime: 3000, // Consider data fresh for 3 seconds
  });

  // Convert BobCoin balance to number
  const bobcoinBalanceNum = parseFloat(bobcoinBalance) || 0;

  // Calculate locked funds breakdown from database (locked_funds field)
  // Database is source of truth - updated when escrow contracts are created with BobCoins
  // NOTE: Escrow chaincode doesn't have getLockedAmount function, so we use database
  const lockedFundsBreakdown = myProjects
    .filter(p => (p.locked_funds || 0) > 0)
    .map(project => ({
      projectId: project.id,
      project: project.title,
      amount: project.locked_funds || 0, // Database locked_funds (BobCoins locked in escrow)
      milestones: project.milestones?.filter(m => m.status !== 'completed' && m.status !== 'verified').length || 0,
    }));
  
  // Calculate total locked funds from database
  const totalLockedBobCoins = lockedFundsBreakdown.reduce((sum, item) => sum + item.amount, 0);
  
  const walletData = {
    totalBobCoins: bobcoinBalanceNum, // BobCoin balance from blockchain
    availableBobCoins: Math.max(0, bobcoinBalanceNum - totalLockedBobCoins), // Available after locked
    lockedFunds: totalLockedBobCoins, // Locked BobCoins from database (updated when escrow created)
    pendingRelease: wallet?.pending_release || 0, // Still in USD for now
  };

  const handleRefresh = () => {
    refetchWallet();
    refetchTransactions();
    refetchMyProjects(); // Refresh projects to get updated locked_funds
    // Refetch BobCoin balance
    queryClient.invalidateQueries({ queryKey: ['bobcoin-balance'] });
    toast.success("Wallet data refreshed");
  };

  // Show loading only briefly - don't block UI indefinitely
  // After 1.5 seconds, show the wallet even if data is still loading
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 1500); // Show loading for max 1.5 seconds
    
    return () => clearTimeout(timer);
  }, []);

  // Only show loading screen for first 1.5 seconds - then always show UI
  // Don't wait for queries to complete - they load in background
  if (showLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    );
  }

  // After 1.5 seconds, always render the wallet (data loads in background)

  // Format transactions from database - show BobCoin amounts
  const formattedTransactions = transactions.map(tx => ({
    id: tx.id,
    type: tx.type === 'release' ? 'release' : tx.type === 'lock' ? 'lock' : tx.type === 'withdrawal' ? 'withdraw' : 'deposit',
    title: tx.description || `${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}`,
    project: (tx.project as any)?.title || undefined,
    amount: tx.amount, // Already in BobCoins
    date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: tx.status,
    isBobCoin: true, // Mark as BobCoin transaction
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-28 pb-20">
        <div className="container-editorial">
          {/* Header */}
          <div className="mb-12">
            <div className="label-mono text-accent mb-2">BobPay Wallet</div>
            <h1 className="headline-lg mb-4">Funds Overview</h1>
            <p className="body-lg text-muted-foreground max-w-2xl">
              Your complete financial picture. See available funds, locked escrow, 
              and pending releases all in one place.
            </p>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <BalanceCard 
              icon={WalletIcon}
              label="Total BobCoins"
              amount={walletData.totalBobCoins}
              variant="primary"
              isBobCoin={true}
            />
            <BalanceCard 
              icon={CheckCircle}
              label="Available BobCoins"
              amount={walletData.availableBobCoins}
              variant="success"
              actionLabel="Redeem"
              isBobCoin={true}
            />
            <BalanceCard 
              icon={Lock}
              label="Locked in Escrow"
              amount={walletData.lockedFunds}
              variant="warning"
              isBobCoin={true}
            />
            <BalanceCard 
              icon={Clock}
              label="Pending Release"
              amount={walletData.pendingRelease}
              variant="accent"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Transaction History */}
            <div className="lg:col-span-2">
              <div className="bg-secondary border-3 border-foreground brutal-shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display font-bold text-xl">Transaction History</h2>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefresh}
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </Button>
                </div>

                <div className="space-y-4">
                  {formattedTransactions.length > 0 ? (
                    formattedTransactions.map((tx) => (
                      <TransactionItem key={tx.id} transaction={tx} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions yet
                    </div>
                  )}
                </div>

                <Button 
                  variant="outline" 
                  className="w-full mt-6"
                  onClick={() => toast.info("Transaction history expanded view coming soon!")}
                >
                  View All Transactions
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-background border-3 border-foreground brutal-shadow p-6">
                <h3 className="font-display font-bold text-lg mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button 
                    variant="accent" 
                    className="w-full"
                    onClick={() => setDepositDialogOpen(true)}
                  >
                    <Plus size={18} />
                    Buy BobCoins
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setWithdrawDialogOpen(true)}
                    disabled={walletData.availableBobCoins === 0}
                  >
                    <ArrowUpRight size={18} />
                    Redeem BobCoins
                  </Button>
                </div>
              </div>

              {/* Locked Funds Breakdown */}
              <div className="bg-warning/10 border-3 border-warning p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="text-warning" size={24} />
                  <h3 className="font-display font-bold text-lg">Locked Funds</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  These funds are held in escrow for active projects. They will be released 
                  when milestones are verified or returned if work isn't delivered.
                </p>

                <div className="space-y-3">
                  {lockedFundsBreakdown.length > 0 ? (
                    lockedFundsBreakdown.map((item) => {
                      const linkPrefix = profile?.role === 'client' ? '/client' : '/freelancer';
                      return (
                        <Link 
                          key={item.projectId} 
                          to={`${linkPrefix}/project/${item.projectId}`}
                          className="block"
                        >
                          <div className="p-3 bg-background border-3 border-foreground hover:bg-secondary transition-colors cursor-pointer">
                            <div className="font-display font-bold">{item.project}</div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-muted-foreground">{item.milestones} milestones remaining</span>
                              <span className="font-display font-bold">{item.amount.toLocaleString()} BC</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No locked funds
                    </div>
                  )}
                </div>
              </div>

              {/* Security Info */}
              <div className="bg-secondary border-3 border-foreground p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="text-success" size={24} />
                  <h3 className="font-display font-bold text-lg">Security</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-success" />
                    256-bit encryption
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-success" />
                    Smart contract escrow
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-success" />
                    Multi-signature protection
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-success" />
                    Blockchain verified
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* How Funds Flow */}
          <div className="mt-16">
            <h2 className="font-display font-bold text-2xl mb-8 text-center">How Funds Flow in BobPay</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <FlowStep 
                number="1"
                title="Client Deposits"
                description="Funds are deposited and locked in a smart contract before work begins"
              />
              <FlowStep 
                number="2"
                title="Escrow Holds"
                description="Money is held securely—neither party can access it unilaterally"
              />
              <FlowStep 
                number="3"
                title="Work Verified"
                description="AI verification checks deliverables against milestone requirements"
              />
              <FlowStep 
                number="4"
                title="Auto Release"
                description="When conditions are met, payment releases instantly to freelancer"
              />
            </div>
          </div>
        </div>
      </main>

      <DepositDialog
        open={depositDialogOpen}
        onOpenChange={(open) => {
          setDepositDialogOpen(open);
          if (!open) {
            // Refresh BobCoin balance when dialog closes
            queryClient.invalidateQueries({ queryKey: ['bobcoin-balance'] });
            refetchWallet();
          }
        }}
        currentBalance={walletData.totalBobCoins}
      />

      <WithdrawalDialog
        open={withdrawDialogOpen}
        onOpenChange={(open) => {
          setWithdrawDialogOpen(open);
          if (!open) {
            // Refresh BobCoin balance when dialog closes
            queryClient.invalidateQueries({ queryKey: ['bobcoin-balance'] });
            refetchWallet();
          }
        }}
        currentBalance={walletData.availableBobCoins}
      />

      <Footer />
    </div>
  );
};

interface BalanceCardProps {
  icon: any;
  label: string;
  amount: number;
  variant: "primary" | "success" | "warning" | "accent";
  actionLabel?: string;
  isBobCoin?: boolean;
}

const BalanceCard = ({ icon: Icon, label, amount, variant, actionLabel, isBobCoin = false }: BalanceCardProps) => {
  const variants = {
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    accent: "bg-accent text-accent-foreground",
  };

  return (
    <div className={`border-3 border-foreground brutal-shadow p-6 ${variants[variant]}`}>
      <div className="flex items-center justify-between mb-4">
        <Icon size={24} />
        <span className="label-mono opacity-80">{label}</span>
      </div>
      <div className="font-display font-bold text-3xl mb-2">
        {isBobCoin ? (
          <>
            {amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="text-xl ml-2 opacity-90">BC</span>
          </>
        ) : (
          <>${amount.toLocaleString()}</>
        )}
      </div>
      {isBobCoin && (
        <p className="text-xs opacity-80 mb-2">
          ≈ ${(amount * 1).toLocaleString()} USD
        </p>
      )}
      {actionLabel && (
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2 border-current text-current hover:bg-current/10"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

interface TransactionItemProps {
  transaction: {
    id: string;
    type: string;
    title: string;
    project?: string;
    amount: number;
    date: string;
    status: string;
  };
}

const TransactionItem = ({ transaction }: TransactionItemProps) => {
  const typeConfig = {
    release: { icon: ArrowDownLeft, color: "text-success", prefix: "+" },
    lock: { icon: Lock, color: "text-warning", prefix: "-" },
    withdraw: { icon: ArrowUpRight, color: "text-foreground", prefix: "-" },
    deposit: { icon: ArrowDownLeft, color: "text-success", prefix: "+" },
  };

  const config = typeConfig[transaction.type as keyof typeof typeConfig];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-4 p-4 bg-background border-3 border-foreground">
      <div className={`w-12 h-12 border-3 border-foreground flex items-center justify-center ${transaction.type === "lock" ? "bg-warning" : "bg-success"}`}>
        <Icon size={20} className={transaction.type === "lock" ? "text-warning-foreground" : "text-success-foreground"} />
      </div>
      <div className="flex-1">
        <div className="font-display font-bold">{transaction.title}</div>
        {transaction.project && (
          <div className="text-sm text-muted-foreground">{transaction.project}</div>
        )}
      </div>
      <div className="text-right">
        <div className={`font-display font-bold text-lg ${config.color}`}>
          {config.prefix}{(transaction as any).isBobCoin ? (
            <>
              {transaction.amount.toLocaleString()} BC
            </>
          ) : (
            <>${transaction.amount.toLocaleString()}</>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{transaction.date}</div>
      </div>
    </div>
  );
};

const FlowStep = ({ number, title, description }: { number: string; title: string; description: string }) => (
  <div className="bg-background border-3 border-foreground brutal-shadow p-6 text-center">
    <div className="w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xl mx-auto mb-4">
      {number}
    </div>
    <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Wallet;
