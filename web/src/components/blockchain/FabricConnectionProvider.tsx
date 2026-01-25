import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { connectToFabric, disconnectFromFabric, isConnected } from '@/lib/fabric-connection';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface FabricContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnect: () => Promise<void>;
}

const FabricContext = createContext<FabricContextType | undefined>(undefined);

export const useFabric = () => {
  const context = useContext(FabricContext);
  if (!context) {
    throw new Error('useFabric must be used within FabricConnectionProvider');
  }
  return context;
};

interface FabricConnectionProviderProps {
  children: ReactNode;
}

export const FabricConnectionProvider = ({ children }: FabricConnectionProviderProps) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    setError(null);
    
    try {
      await connectToFabric();
      setConnected(true);
      toast.success('Connected to blockchain network');
    } catch (err: any) {
      setError(err.message);
      setConnected(false);
      toast.error(`Failed to connect to blockchain: ${err.message}`);
      console.error('Fabric connection error:', err);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await disconnectFromFabric();
      setConnected(false);
    } catch (err: any) {
      console.error('Error disconnecting:', err);
    }
  };

  useEffect(() => {
    // Auto-connect on mount
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  const reconnect = async () => {
    await disconnect();
    await connect();
  };

  return (
    <FabricContext.Provider
      value={{
        isConnected: connected,
        isConnecting: connecting,
        error,
        reconnect,
      }}
    >
      {connecting && (
        <div className="fixed top-0 left-0 right-0 bg-warning/90 text-warning-foreground p-2 text-center z-50 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Connecting to blockchain network...</span>
        </div>
      )}
      {error && !connecting && (
        <div className="fixed top-0 left-0 right-0 bg-destructive/90 text-destructive-foreground p-2 text-center z-50">
          <span>Blockchain connection error: {error}</span>
          <button
            onClick={reconnect}
            className="ml-4 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}
      {children}
    </FabricContext.Provider>
  );
};
