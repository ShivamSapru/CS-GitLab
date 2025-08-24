import React from "react";
import {
  Heart,
  Code,
  Globe,
  Users,
  Brain,
  Zap,
  Shield,
  Rocket,
  Coffee,
  Star,
  Linkedin,
} from "lucide-react";

const About = ({ isDarkMode }) => {
  const teamMembers = [
    {
      name: "Samudra Borkakoti",
      role: "Project Lead & Backend Developer",
      icon: Code,
      color: isDarkMode ? "text-blue-400" : "text-blue-600",
      description:
        "Led project planning and backend development, building scalable FastAPI pipelines with Azure services and real-time translation through a Chrome Extension.",
      linkedin: "https://www.linkedin.com/in/samudra-borkakoti/ ",
    },
    {
      name: "Shubham Limkar",
      role: "Infrastructure & Extension Developer",
      icon: Brain,
      color: isDarkMode ? "text-purple-400" : "text-purple-600",
      description:
        "Set up Docker, CI/CD, and secure storage, while developing the Chrome Extension end-to-end and ensuring smooth integration with the webapp.",
      linkedin: "https://www.linkedin.com/in/srlimkar/",
    },
    {
      name: "Yadnesh Sirdeshmukh",
      role: "Backend & Deployment Developer",
      icon: Rocket,
      color: isDarkMode ? "text-green-400" : "text-green-600",
      description:
        "Implemented secure authentication, modularised backend routes, managed Azure deployments, and ensured the system was production-ready.",
      linkedin: "https://www.linkedin.com/in/yadnesh-sirdeshmukh",
    },
    {
      name: "Pratham Sharma",
      role: "Frontend Developer",
      icon: Star,
      color: isDarkMode ? "text-pink-400" : "text-pink-600",
      description:
        "Designed and built the frontend with React and Tailwind, creating responsive UIs and seamless workflows for translation, transcription, and project management.",
      linkedin: "https://www.linkedin.com/in/pratham-sharma-30a87a212/",
    },
    {
      name: "Rishabh Lingsugur",
      role: "Documentation & Communication Lead",
      icon: Shield,
      color: isDarkMode ? "text-orange-400" : "text-orange-600",
      description:
        "Maintained documentation, user stories, and testing workflows while making presentations and reports to clearly communicate the team's work.",
      linkedin: "https://www.linkedin.com/in/rishabh-lingsugur-50330b209/",
    },
    {
      name: "Shivam Sapru",
      role: "Database & Backend Developer",
      icon: Zap,
      color: isDarkMode ? "text-yellow-400" : "text-yellow-600",
      description:
        "Designed the database schema, implemented user management routes, and added health checks for reliable data storage and system stability.",
      linkedin: "https://www.linkedin.com/in/shivam-sapru/",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
      <div className="text-center mb-8 sm:mb-12">
        <h2
          className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-4 sm:mb-6 ${isDarkMode ? "text-white" : "text-gray-900"} leading-tight`}
        >
          Meet Our Team
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
        {teamMembers.map((member, index) => {
          const IconComponent = member.icon;
          return (
            <div
              key={index}
              className={`relative group p-4 sm:p-6 rounded-xl sm:rounded-2xl ${isDarkMode ? "bg-white/5" : "bg-black/5"} backdrop-blur-sm transition-all duration-300 hover:scale-105 ${isDarkMode ? "hover:bg-white/10" : "hover:bg-black/10"}`}
            >
              {/* LinkedIn Button */}
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className={`absolute top-3 right-3 sm:top-4 sm:right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 rounded-full ${isDarkMode ? "bg-white/10 hover:bg-white/20" : "bg-black/10 hover:bg-black/20"} backdrop-blur-sm touch-manipulation`}
                title={`Visit ${member.name}'s LinkedIn`}
              >
                <Linkedin
                  className={`w-3 h-3 sm:w-4 sm:h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
                />
              </a>

              <div className="flex items-center mb-3 sm:mb-4">
                <IconComponent
                  className={`w-6 h-6 sm:w-8 sm:h-8 ${member.color} mr-2 sm:mr-3`}
                />
                <div>
                  <h3
                    className={`text-lg sm:text-xl font-medium ${isDarkMode ? "text-white" : "text-gray-900"} leading-tight`}
                  >
                    {member.name}
                  </h3>
                  <p
                    className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"} leading-tight`}
                  >
                    {member.role}
                  </p>
                </div>
              </div>
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} leading-relaxed text-xs sm:text-sm`}
              >
                {member.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <div
          className={`inline-flex items-center px-6 py-3 rounded-full ${isDarkMode ? "bg-white/10" : "bg-black/10"} backdrop-blur-sm`}
        >
          <Heart
            className={`w-5 h-5 ${isDarkMode ? "text-red-400" : "text-red-500"} mr-2`}
          />
          <span className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
            Made with passion for global communication
          </span>
        </div>
      </div>
    </div>
  );
};

export default About;
