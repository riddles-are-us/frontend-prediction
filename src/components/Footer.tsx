import { Badge } from "./ui/badge";

const Footer = () => {
  const socialLinks = [
    {
      name: "Twitter",
      url: "https://x.com/DelphinusLab",
      icon: "🐦"
    },
    {
      name: "Discord", 
      url: "https://discord.com/invite/EhFMmF7S7b",
      icon: "💬"
    },
    {
      name: "Telegram",
      url: "https://t.me/DelphinusLabOfficial", 
      icon: "✈️"
    }
  ];

  return (
    <footer className="mt-12 border-t pt-8 pb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-sm text-muted-foreground">
            Connect with DelphinusLab
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Badge 
                  variant="outline" 
                  className="flex items-center gap-2 px-3 py-1 hover:bg-muted transition-colors cursor-pointer group-hover:border-primary"
                >
                  <span className="text-base">{link.icon}</span>
                  <span className="text-sm">{link.name}</span>
                </Badge>
              </a>
            ))}
          </div>
          <div className="text-xs text-muted-foreground text-center">
            © 2025 DelphinusLab. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 