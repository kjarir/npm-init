import { Code, Palette, PenTool, Video, FileText, BarChart, Megaphone, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ProfessionsSection = () => {
  const professions = [
    { icon: Code, title: "Development", description: "Web, mobile, APIs, blockchain", projects: 1240 },
    { icon: Palette, title: "Design", description: "UI/UX, branding, illustration", projects: 890 },
    { icon: PenTool, title: "Writing", description: "Content, copywriting, technical", projects: 650 },
    { icon: Video, title: "Video & Animation", description: "Motion graphics, editing, 3D", projects: 420 },
    { icon: FileText, title: "Documentation", description: "Technical writing, manuals, SOPs", projects: 380 },
    { icon: BarChart, title: "Data & Analytics", description: "Analysis, visualization, ML", projects: 290 },
    { icon: Megaphone, title: "Marketing", description: "Strategy, SEO, social media", projects: 560 },
    { icon: Wrench, title: "Consulting", description: "Business, legal, technical", projects: 340 },
  ];

  return (
    <section className="editorial-section">
      <div className="container-editorial">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="label-mono text-accent mb-4">Built for Every Profession</div>
          <h2 className="headline-lg mb-6">
            One platform.
            <br />
            <span className="text-muted-foreground">Every kind of work.</span>
          </h2>
          <p className="body-lg text-muted-foreground">
            From code to content, design to data. BobPay's milestone system works for any project 
            with clear deliverables. If it can be verified, it can be paid fairly.
          </p>
        </div>

        {/* Professions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {professions.map((prof) => (
            <div 
              key={prof.title}
              className="bg-background border-3 border-foreground brutal-shadow p-6 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-secondary group-hover:bg-accent transition-colors flex items-center justify-center mb-4">
                <prof.icon className="text-foreground group-hover:text-accent-foreground" size={24} />
              </div>
              <h3 className="font-display font-bold text-lg mb-1">{prof.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{prof.description}</p>
              <div className="text-xs font-display uppercase tracking-wider text-accent">
                {prof.projects.toLocaleString()} active projects
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6">Ready to work fairly?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/client/create-project">
              <Button variant="hero" size="xl">Post Your First Project</Button>
            </Link>
            <Link to="/freelancer/projects">
              <Button variant="outline" size="xl">Browse Available Work</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionsSection;
