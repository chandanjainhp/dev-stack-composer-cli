import React from 'react';

const About: React.FC = () => {
  return (
    <div className="about-page">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">About Us</h1>
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
              <p className="text-gray-600 mb-6">
                We're passionate about creating innovative solutions that help developers
                build amazing applications faster and more efficiently. Our MERN stack
                platform empowers teams to focus on what matters most - creating value
                for their users.
              </p>
              <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Innovation and continuous learning</li>
                <li>Quality and attention to detail</li>
                <li>Collaboration and teamwork</li>
                <li>User-centric design</li>
              </ul>
            </div>
            <div className="bg-gray-100 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Get In Touch</h3>
              <p className="text-gray-600 mb-4">
                Have questions or want to learn more? We'd love to hear from you!
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  <strong>Email:</strong> hello@example.com
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Phone:</strong> (555) 123-4567
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Address:</strong> 123 Tech Street, San Francisco, CA
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
