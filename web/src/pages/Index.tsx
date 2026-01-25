import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import MilestoneSection from "@/components/landing/MilestoneSection";
import AutoPaymentSection from "@/components/landing/AutoPaymentSection";
import AIVerificationSection from "@/components/landing/AIVerificationSection";
import PrivateStorageSection from "@/components/landing/PrivateStorageSection";
import FairExitSection from "@/components/landing/FairExitSection";
import ReputationSection from "@/components/landing/ReputationSection";
import ProfessionsSection from "@/components/landing/ProfessionsSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <MilestoneSection />
      <AutoPaymentSection />
      <AIVerificationSection />
      <PrivateStorageSection />
      <FairExitSection />
      <ReputationSection />
      <ProfessionsSection />
      <Footer />
    </div>
  );
};

export default Index;
