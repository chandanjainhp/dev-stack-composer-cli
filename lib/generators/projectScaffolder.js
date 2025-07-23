const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const Handlebars = require('handlebars');

class ProjectScaffolder {
  constructor() {
    this.templatePath = path.join(__dirname, '../../templates');
    this.setupHandlebarsHelpers();
  }

  /**
   * Setup Handlebars helpers for template processing
   */
  setupHandlebarsHelpers() {
    // Helper to convert string to kebab-case
    Handlebars.registerHelper('kebabCase', (str) => {
      return str.toLowerCase().replace(/[^a-z0-9]/g, '-');
    });

    // Helper to convert string to PascalCase
    Handlebars.registerHelper('pascalCase', (str) => {
      return str.replace(/(?:^|[\s-_]+)(\w)/g, (match, letter) => letter.toUpperCase());
    });

    // Helper to convert string to camelCase
    Handlebars.registerHelper('camelCase', (str) => {
      const pascal = str.replace(/(?:^|[\s-_]+)(\w)/g, (match, letter) => letter.toUpperCase());
      return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    });

    // Helper for conditional rendering
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Helper to check if array includes value
    Handlebars.registerHelper('includes', function(array, value, options) {
      if (Array.isArray(array) && array.includes(value)) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Helper to format date
    Handlebars.registerHelper('currentYear', () => new Date().getFullYear());
  }

  /**
   * Scaffold project based on configuration
   * @param {object} config - Project configuration
   * @param {string} targetPath - Target directory path
   */
  async scaffoldProject(config, targetPath) {
    try {
      // Ensure target directory exists
      await fs.ensureDir(targetPath);

      // Determine template directory
      const templateDir = await this.getTemplateDirectory(config.projectType);
      
      if (!fs.existsSync(templateDir)) {
        // Create basic template structure if template doesn't exist
        await this.createBasicTemplate(config, targetPath);
        return;
      }

      // Copy template files with processing
      await this.copyTemplateFiles(templateDir, targetPath, config);

      // Generate dynamic files based on configuration
      await this.generateDynamicFiles(config, targetPath);

      // Update package.json files with project-specific information
      await this.updatePackageFiles(config, targetPath);

      if (process.env.VERBOSE) {
        console.log(chalk.green('✅ Project scaffolding completed'));
      }
    } catch (error) {
      throw new Error(`Project scaffolding failed: ${error.message}`);
    }
  }

  /**
   * Get template directory path for project type
   * @param {string} projectType - Type of project
   * @returns {string} Template directory path
   */
  async getTemplateDirectory(projectType) {
    const templateMap = {
      'mern': 'mern-fullstack',
      'fullstack': 'mern-fullstack',
      'react': 'react-spa',
      'nextjs': 'nextjs-app',
      'vue': 'vue-spa',
      'express': 'express-api',
      'api': 'express-api'
    };

    const templateName = templateMap[projectType] || 'mern-fullstack';
    return path.join(this.templatePath, templateName);
  }

  /**
   * Copy template files with variable substitution
   * @param {string} templateDir - Template directory
   * @param {string} targetPath - Target directory
   * @param {object} config - Configuration object
   */
  async copyTemplateFiles(templateDir, targetPath, config) {
    try {
      // Get all files in template directory
      const files = await this.getTemplateFiles(templateDir);
      
      for (const file of files) {
        const srcPath = path.join(templateDir, file);
        const destPath = path.join(targetPath, file);
        
        const stat = await fs.stat(srcPath);
        
        if (stat.isDirectory()) {
          await fs.ensureDir(destPath);
        } else {
          // Process file content if it's a text file
          if (this.isTextFile(file)) {
            const content = await fs.readFile(srcPath, 'utf8');
            const processedContent = this.processTemplate(content, config);
            await fs.outputFile(destPath, processedContent);
          } else {
            // Copy binary files directly
            await fs.copy(srcPath, destPath);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to copy template files: ${error.message}`);
    }
  }

  /**
   * Get all template files recursively
   * @param {string} templateDir - Template directory
   * @returns {Array} Array of relative file paths
   */
  async getTemplateFiles(templateDir) {
    const files = [];
    
    const scanDirectory = async (dir, relativePath = '') => {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativeItemPath = path.join(relativePath, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          files.push(relativeItemPath);
          await scanDirectory(fullPath, relativeItemPath);
        } else {
          files.push(relativeItemPath);
        }
      }
    };
    
    await scanDirectory(templateDir);
    return files;
  }

  /**
   * Check if file is a text file that should be processed
   * @param {string} filename - File name
   * @returns {boolean} Is text file
   */
  isTextFile(filename) {
    const textExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.env',
      '.yml', '.yaml', '.xml', '.html', '.css', '.scss', '.sass',
      '.vue', '.gitignore', '.dockerignore', '.eslintrc', '.prettierrc'
    ];
    
    const ext = path.extname(filename).toLowerCase();
    return textExtensions.includes(ext) || !ext; // Files without extension
  }

  /**
   * Process template content with Handlebars
   * @param {string} content - Template content
   * @param {object} config - Configuration object
   * @returns {string} Processed content
   */
  processTemplate(content, config) {
    try {
      const template = Handlebars.compile(content);
      return template({
        ...config,
        // Add additional template variables
        projectNameKebab: config.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        projectNamePascal: config.projectName.replace(/(?:^|[\s-_]+)(\w)/g, (match, letter) => letter.toUpperCase()),
        projectNameCamel: (() => {
          const pascal = config.projectName.replace(/(?:^|[\s-_]+)(\w)/g, (match, letter) => letter.toUpperCase());
          return pascal.charAt(0).toLowerCase() + pascal.slice(1);
        })(),
        currentYear: new Date().getFullYear(),
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      if (process.env.DEBUG) {
        console.log(chalk.yellow(`🔍 Template processing failed for content: ${content.substring(0, 100)}...`));
      }
      // Return original content if template processing fails
      return content;
    }
  }

  /**
   * Generate dynamic files based on configuration
   * @param {object} config - Project configuration
   * @param {string} targetPath - Target directory
   */
  async generateDynamicFiles(config, targetPath) {
    // Generate README.md
    await this.generateReadme(config, targetPath);
    
    // Generate .gitignore
    await this.generateGitignore(config, targetPath);
    
    // Generate Docker files if enabled
    if (config.docker) {
      await this.generateDockerFiles(config, targetPath);
    }
    
    // Generate CI/CD configuration if deployment is configured
    if (config.deployment) {
      await this.generateCICDConfig(config, targetPath);
    }
  }

  /**
   * Generate README.md file
   * @param {object} config - Project configuration
   * @param {string} targetPath - Target directory
   */
  async generateReadme(config, targetPath) {
    const readmeContent = `# ${config.projectName}

${config.description || 'A MERN stack application generated with Dev Stack Composer.'}

## 🚀 Features

${config.features.map(feature => `- ${feature.charAt(0).toUpperCase() + feature.slice(1)}`).join('\n')}

## 🛠️ Tech Stack

- **Frontend**: ${this.getFrontendTech(config)}
- **Backend**: ${this.getBackendTech(config)}
- **Database**: ${config.database.charAt(0).toUpperCase() + config.database.slice(1)}
${config.authentication ? '- **Authentication**: JWT with bcrypt encryption' : ''}

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- ${config.database === 'mongodb' ? 'MongoDB' : config.database}
- Git

### Setup

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd ${config.projectName.toLowerCase()}
   \`\`\`

2. **Install dependencies**
   ${this.getInstallCommands(config)}

3. **Environment Configuration**
   ${this.getEnvSetupInstructions(config)}

4. **Start the application**
   ${this.getStartCommands(config)}

## 🔧 Development

${this.getDevelopmentInstructions(config)}

## 🚀 Deployment

${this.getDeploymentInstructions(config)}

## 📝 License

This project is licensed under the MIT License.

---

Generated with ❤️ by [Dev Stack Composer](https://github.com/chandanjainhp/dev-stack-composer)
`;

    await fs.outputFile(path.join(targetPath, 'README.md'), readmeContent);
  }

  /**
   * Generate .gitignore file
   * @param {object} config - Project configuration
   * @param {string} targetPath - Target directory
   */
  async generateGitignore(config, targetPath) {
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
build/
dist/
.next/
.nuxt/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed

# Coverage directory used by tools like istanbul
coverage/

# Database
*.sqlite
*.db

${config.docker ? `# Docker
docker-compose.override.yml` : ''}

${config.projectType === 'react' || config.projectType === 'nextjs' ? `# React/Next.js specific
.eslintcache` : ''}

# Temporary files
temp/
tmp/
`;

    await fs.outputFile(path.join(targetPath, '.gitignore'), gitignoreContent);
  }

  /**
   * Generate Docker configuration files
   * @param {object} config - Project configuration
   * @param {string} targetPath - Target directory
   */
  async generateDockerFiles(config, targetPath) {
    // Generate Dockerfile for client (if applicable)
    if (config.projectType === 'mern' || config.projectType === 'react' || config.projectType === 'nextjs') {
      const clientDockerfile = this.generateClientDockerfile(config);
      await fs.outputFile(path.join(targetPath, 'client', 'Dockerfile'), clientDockerfile);
    }

    // Generate Dockerfile for server (if applicable)
    if (config.projectType === 'mern' || config.projectType === 'express') {
      const serverDockerfile = this.generateServerDockerfile(config);
      await fs.outputFile(path.join(targetPath, 'server', 'Dockerfile'), serverDockerfile);
    }

    // Generate docker-compose.yml
    const dockerCompose = this.generateDockerCompose(config);
    await fs.outputFile(path.join(targetPath, 'docker-compose.yml'), dockerCompose);
  }

  /**
   * Update package.json files with project-specific information
   * @param {object} config - Project configuration
   * @param {string} targetPath - Target directory
   */
  async updatePackageFiles(config, targetPath) {
    const packageFiles = [];
    
    // Find all package.json files
    if (fs.existsSync(path.join(targetPath, 'package.json'))) {
      packageFiles.push(path.join(targetPath, 'package.json'));
    }
    if (fs.existsSync(path.join(targetPath, 'client', 'package.json'))) {
      packageFiles.push(path.join(targetPath, 'client', 'package.json'));
    }
    if (fs.existsSync(path.join(targetPath, 'server', 'package.json'))) {
      packageFiles.push(path.join(targetPath, 'server', 'package.json'));
    }

    for (const packageFile of packageFiles) {
      try {
        const packageData = await fs.readJson(packageFile);
        
        // Update project information
        packageData.name = config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        packageData.version = '1.0.0';
        packageData.description = config.description || `A ${config.projectType} application`;
        packageData.author = process.env.USER || process.env.USERNAME || 'Developer';
        
        await fs.writeJson(packageFile, packageData, { spaces: 2 });
      } catch (error) {
        if (process.env.DEBUG) {
          console.log(chalk.yellow(`🔍 Could not update ${packageFile}:`, error.message));
        }
      }
    }
  }

  /**
   * Create basic template structure if no template exists
   * @param {object} config - Project configuration
   * @param {string} targetPath - Target directory
   */
  async createBasicTemplate(config, targetPath) {
    // Create basic project structure based on type
    if (config.projectType === 'mern' || config.projectType === 'fullstack') {
      await this.createMERNStructure(config, targetPath);
    } else if (config.projectType === 'react') {
      await this.createReactStructure(config, targetPath);
    } else if (config.projectType === 'express') {
      await this.createExpressStructure(config, targetPath);
    } else {
      await this.createGenericStructure(config, targetPath);
    }
  }

  /**
   * Create MERN project structure
   * @param {object} config - Project configuration
   * @param {string} targetPath - Target directory
   */
  async createMERNStructure(config, targetPath) {
    // Create directory structure
    const dirs = [
      'client/src/components',
      'client/src/pages',
      'client/src/hooks',
      'client/src/context',
      'client/src/utils',
      'client/public',
      'server/src/controllers',
      'server/src/models',
      'server/src/routes',
      'server/src/middleware',
      'server/src/utils'
    ];

    for (const dir of dirs) {
      await fs.ensureDir(path.join(targetPath, dir));
    }

    // Create basic files
    await this.createBasicPackageJson(config, targetPath, 'root');
    await this.createBasicPackageJson(config, path.join(targetPath, 'client'), 'client');
    await this.createBasicPackageJson(config, path.join(targetPath, 'server'), 'server');
  }

  /**
   * Create basic package.json file
   * @param {object} config - Project configuration
   * @param {string} targetPath - Target directory
   * @param {string} type - Package type (root, client, server)
   */
  async createBasicPackageJson(config, targetPath, type) {
    let packageData = {
      name: `${config.projectName.toLowerCase()}-${type}`,
      version: '1.0.0',
      description: `${config.projectName} ${type}`,
      main: 'index.js',
      scripts: {},
      dependencies: {},
      devDependencies: {}
    };

    if (type === 'client') {
      packageData.scripts = {
        start: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test',
        eject: 'react-scripts eject'
      };
      packageData.dependencies = {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-scripts': '^5.0.1'
      };
    } else if (type === 'server') {
      packageData.scripts = {
        start: 'node src/index.js',
        dev: 'nodemon src/index.js',
        test: 'jest'
      };
      packageData.dependencies = {
        express: '^4.18.2',
        cors: '^2.8.5',
        dotenv: '^16.3.1'
      };
      packageData.devDependencies = {
        nodemon: '^3.0.1'
      };
    }

    await fs.writeJson(path.join(targetPath, 'package.json'), packageData, { spaces: 2 });
  }

  // Helper methods for README generation
  getFrontendTech(config) {
    const techs = [];
    if (config.projectType.includes('react') || config.projectType === 'mern') {
      techs.push('React 18');
    }
    if (config.projectType === 'nextjs') {
      techs.push('Next.js');
    }
    if (config.projectType === 'vue') {
      techs.push('Vue.js');
    }
    if (config.typescript) {
      techs.push('TypeScript');
    }
    if (config.uiLibrary !== 'none') {
      techs.push(config.uiLibrary);
    }
    return techs.join(', ') || 'HTML/CSS/JS';
  }

  getBackendTech(config) {
    const techs = ['Node.js', 'Express.js'];
    if (config.authentication) {
      techs.push('JWT Authentication');
    }
    return techs.join(', ');
  }

  getInstallCommands(config) {
    if (config.projectType === 'mern') {
      return `   \`\`\`bash
   # Install server dependencies
   cd server && npm install
   
   # Install client dependencies
   cd ../client && npm install
   \`\`\``;
    }
    return `   \`\`\`bash
   npm install
   \`\`\``;
  }

  getEnvSetupInstructions(config) {
    return `   \`\`\`bash
   # Copy environment template
   cp server/.env.example server/.env
   
   # Update the .env file with your configuration
   \`\`\``;
  }

  getStartCommands(config) {
    if (config.projectType === 'mern') {
      return `   \`\`\`bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately:
   # Backend: cd server && npm run dev
   # Frontend: cd client && npm start
   \`\`\``;
    }
    return `   \`\`\`bash
   npm run dev
   \`\`\``;
  }

  getDevelopmentInstructions(config) {
    return `### Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm test\` - Run tests
- \`npm run lint\` - Run linting

### Project Structure

${this.getProjectStructureDescription(config)}`;
  }

  getProjectStructureDescription(config) {
    if (config.projectType === 'mern') {
      return `- \`client/\` - React frontend application
- \`server/\` - Express.js backend API
- \`shared/\` - Shared utilities and types`;
    }
    return '- Standard project structure with source files in `src/`';
  }

  getDeploymentInstructions(config) {
    if (config.deployment) {
      return `This project is configured for deployment on ${config.deployment.platform}.

Check the deployment configuration files for platform-specific setup instructions.`;
    }
    return 'Configure your preferred deployment platform using the provided scripts.';
  }

  generateClientDockerfile(config) {
    return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
`;
  }

  generateServerDockerfile(config) {
    return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
`;
  }

  generateDockerCompose(config) {
    return `version: '3.8'

services:
  ${config.projectType === 'mern' ? `client:
    build: ./client
    ports:
      - "3000:3000"
    depends_on:
      - server
    environment:
      - REACT_APP_API_URL=http://localhost:8000

  server:
    build: ./server
    ports:
      - "8000:8000"
    depends_on:
      - mongodb
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/${config.projectName}

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:` : `app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production`}
`;
  }

  generateCICDConfig(config, targetPath) {
    // This would generate GitHub Actions, GitLab CI, etc. based on deployment platform
    // Implementation would go here
  }
}

module.exports = ProjectScaffolder;
