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
} from "lucide-react";

const About = ({ isDarkMode }) => {
  const teamMembers = [
    {
      name: "Samudra Borkakoti",
      role: "Role",
      icon: Code,
      color: isDarkMode ? "text-blue-400" : "text-blue-600",
      description: "Description",
    },
    {
      name: "Shubham Limkar",
      role: "Role",
      icon: Brain,
      color: isDarkMode ? "text-purple-400" : "text-purple-600",
      description: "Description",
    },
    {
      name: "Yadnesh Sirdeshmukh",
      role: "Role",
      icon: Rocket,
      color: isDarkMode ? "text-green-400" : "text-green-600",
      description: "Description",
    },
    {
      name: "Pratham Sharma",
      role: "Role",
      icon: Star,
      color: isDarkMode ? "text-pink-400" : "text-pink-600",
      description: "Description",
    },
    {
      name: "Rishabh Lingsugur",
      role: "Role",
      icon: Shield,
      color: isDarkMode ? "text-orange-400" : "text-orange-600",
      description: "Description",
    },
    {
      name: "Shivam Sapru",
      role: "Role",
      icon: Zap,
      color: isDarkMode ? "text-yellow-400" : "text-yellow-600",
      description: "Description",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-8 py-16">
      <div className="text-center mb-12">
        <h2
          className={`text-4xl md:text-5xl font-light mb-6 ${isDarkMode ? "text-white" : "text-gray-900"}`}
        >
          Meet Our Team
        </h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {teamMembers.map((member, index) => {
          const IconComponent = member.icon;
          return (
            <div
              key={index}
              className={`p-6 rounded-2xl ${isDarkMode ? "bg-white/5" : "bg-black/5"} backdrop-blur-sm transition-transform hover:scale-105`}
            >
              <div className="flex items-center mb-4">
                <IconComponent className={`w-8 h-8 ${member.color} mr-3`} />
                <div>
                  <h3
                    className={`text-xl font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    {member.name}
                  </h3>
                  <p
                    className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {member.role}
                  </p>
                </div>
              </div>
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} leading-relaxed text-sm`}
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
