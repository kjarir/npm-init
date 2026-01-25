import { HardDrive, Lock, Eye, EyeOff, Key, Shield } from "lucide-react";

const PrivateStorageSection = () => {
  return (
    <section className="editorial-section bg-secondary">
      <div className="container-editorial">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="label-mono text-accent">Private Proof Storage</div>
            <h2 className="headline-lg">
              Your work stays
              <span className="text-accent"> private.</span>
              <br />
              Until you decide otherwise.
            </h2>
            <p className="body-lg text-muted-foreground">
              Deliverables are encrypted and stored on decentralized infrastructure. Only authorized 
              parties can access files. Perfect for NDA work, proprietary designs, and sensitive data.
            </p>

            <div className="space-y-4">
              <PrivacyFeature 
                icon={Lock} 
                title="End-to-End Encryption" 
                description="Files encrypted before upload, only decrypted by authorized keys" 
              />
              <PrivacyFeature 
                icon={HardDrive} 
                title="Decentralized Storage" 
                description="No single point of failure, data spread across secure nodes" 
              />
              <PrivacyFeature 
                icon={Key} 
                title="Access Control" 
                description="Granular permissions for who can view, download, or verify" 
              />
            </div>
          </div>

          {/* Right Visual */}
          <div className="bg-background border-3 border-foreground brutal-shadow-lg p-8">
            <div className="label-mono text-muted-foreground mb-6">File Security Status</div>

            {/* File List */}
            <div className="space-y-4">
              <FileItem 
                name="brand-guidelines.pdf"
                size="12.4 MB"
                encrypted={true}
                access={["Client", "Freelancer"]}
              />
              <FileItem 
                name="source-code.zip"
                size="156 MB"
                encrypted={true}
                access={["Client", "Freelancer", "Verifier"]}
              />
              <FileItem 
                name="contract-final.pdf"
                size="2.1 MB"
                encrypted={true}
                access={["All Parties"]}
              />
              <FileItem 
                name="prototype-demo.mp4"
                size="89 MB"
                encrypted={true}
                access={["Client"]}
              />
            </div>

            {/* Security Summary */}
            <div className="mt-6 pt-6 border-t-3 border-foreground">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-success/10 border-3 border-success p-4 text-center">
                  <Shield className="text-success mx-auto mb-2" size={24} />
                  <div className="font-display font-bold text-success">4 Files</div>
                  <div className="text-sm text-muted-foreground">Encrypted</div>
                </div>
                <div className="bg-primary/10 border-3 border-primary p-4 text-center">
                  <Lock className="text-primary mx-auto mb-2" size={24} />
                  <div className="font-display font-bold">256-bit</div>
                  <div className="text-sm text-muted-foreground">AES Encryption</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const PrivacyFeature = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <div className="flex items-start gap-4">
    <div className="w-12 h-12 bg-primary flex items-center justify-center flex-shrink-0">
      <Icon className="text-primary-foreground" size={24} />
    </div>
    <div>
      <div className="font-display font-bold text-lg">{title}</div>
      <div className="text-muted-foreground">{description}</div>
    </div>
  </div>
);

interface FileItemProps {
  name: string;
  size: string;
  encrypted: boolean;
  access: string[];
}

const FileItem = ({ name, size, encrypted, access }: FileItemProps) => (
  <div className="flex items-center gap-4 p-4 bg-secondary border-3 border-foreground">
    <div className="w-10 h-10 bg-primary flex items-center justify-center">
      {encrypted ? (
        <EyeOff className="text-primary-foreground" size={18} />
      ) : (
        <Eye className="text-primary-foreground" size={18} />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-display font-bold truncate">{name}</div>
      <div className="text-sm text-muted-foreground">{size}</div>
    </div>
    <div className="flex flex-wrap gap-1">
      {access.map((a) => (
        <span key={a} className="text-xs bg-muted px-2 py-1 font-display">
          {a}
        </span>
      ))}
    </div>
  </div>
);

export default PrivateStorageSection;
