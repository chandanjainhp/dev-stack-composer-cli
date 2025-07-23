const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Deployment Setup Handler for configuring various deployment platforms
 */
class DeploymentSetup {
  constructor(reporter) {
    this.reporter = reporter;
  }

  /**
   * Setup deployment configuration based on platform
   */
  async setupDeployment(projectPath, config) {
    const platform = config.deployment?.platform;
    
    if (!platform || platform === 'none') {
      this.reporter.info('No deployment platform specified');
      return { success: true, platform: 'none' };
    }

    this.reporter.info(`Setting up deployment for ${chalk.cyan(platform)}...`);

    const results = [];

    switch (platform.toLowerCase()) {
      case 'vercel':
        results.push(await this.setupVercel(projectPath, config));
        break;
      case 'netlify':
        results.push(await this.setupNetlify(projectPath, config));
        break;
      case 'heroku':
        results.push(await this.setupHeroku(projectPath, config));
        break;
      case 'railway':
        results.push(await this.setupRailway(projectPath, config));
        break;
      case 'render':
        results.push(await this.setupRender(projectPath, config));
        break;
      case 'digitalocean':
        results.push(await this.setupDigitalOcean(projectPath, config));
        break;
      case 'aws':
        results.push(await this.setupAWS(projectPath, config));
        break;
      case 'docker':
        results.push(await this.setupDocker(projectPath, config));
        break;
      default:
        this.reporter.warn(`Unsupported deployment platform: ${platform}`);
        return { success: false, reason: 'unsupported_platform' };
    }

    // Setup CI/CD if specified
    if (config.deployment?.cicd) {
      results.push(await this.setupCICD(projectPath, config));
    }

    this.reporter.success(`Deployment configuration completed for ${platform}`);
    
    return {
      success: true,
      platform,
      configurations: results
    };
  }

  /**
   * Setup Vercel deployment
   */
  async setupVercel(projectPath, config) {
    const vercelConfig = {
      version: 2,
      builds: [
        {
          src: "client/package.json",
          use: "@vercel/static-build",
          config: {
            distDir: "dist"
          }
        },
        {
          src: "server/src/index.js",
          use: "@vercel/node"
        }
      ],
      routes: [
        {
          src: "/api/(.*)",
          dest: "/server/src/index.js"
        },
        {
          src: "/(.*)",
          dest: "/client/dist/$1"
        }
      ],
      env: {
        NODE_ENV: "production"
      },
      functions: {
        "server/src/index.js": {
          maxDuration: 30
        }
      }
    };

    const configPath = path.join(projectPath, 'vercel.json');
    fs.writeFileSync(configPath, JSON.stringify(vercelConfig, null, 2));

    // Create .vercelignore
    const vercelIgnore = `node_modules
.env
.env.local
.git
*.log
.DS_Store
coverage
.nyc_output
`;
    fs.writeFileSync(path.join(projectPath, '.vercelignore'), vercelIgnore);

    return {
      platform: 'vercel',
      files: ['vercel.json', '.vercelignore'],
      instructions: [
        '1. Install Vercel CLI: npm i -g vercel',
        '2. Login to Vercel: vercel login',
        '3. Deploy: vercel --prod',
        '4. Set environment variables in Vercel dashboard'
      ]
    };
  }

  /**
   * Setup Netlify deployment
   */
  async setupNetlify(projectPath, config) {
    const netlifyConfig = {
      build: {
        publish: "client/dist",
        command: "npm run build"
      },
      functions: {
        directory: "server/netlify/functions"
      },
      redirects: [
        {
          from: "/api/*",
          to: "/.netlify/functions/:splat",
          status: 200
        },
        {
          from: "/*",
          to: "/index.html",
          status: 200
        }
      ],
      headers: [
        {
          for: "/api/*",
          values: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
          }
        }
      ]
    };

    const configPath = path.join(projectPath, 'netlify.toml');
    fs.writeFileSync(configPath, this.generateNetlifyToml(netlifyConfig));

    return {
      platform: 'netlify',
      files: ['netlify.toml'],
      instructions: [
        '1. Connect your repository to Netlify',
        '2. Set build command: npm run build',
        '3. Set publish directory: client/dist',
        '4. Add environment variables in Netlify dashboard'
      ]
    };
  }

  /**
   * Setup Heroku deployment
   */
  async setupHeroku(projectPath, config) {
    const procfile = `web: cd server && npm start
worker: cd server && npm run worker`;

    fs.writeFileSync(path.join(projectPath, 'Procfile'), procfile);

    // Create heroku-prebuild script
    const prebuildScript = `#!/bin/bash
echo "Installing client dependencies..."
cd client && npm install
echo "Building client..."
npm run build
echo "Installing server dependencies..."
cd ../server && npm install
`;

    fs.writeFileSync(path.join(projectPath, 'bin', 'heroku-prebuild'), prebuildScript, { mode: 0o755 });

    // Create app.json for Heroku Button
    const appJson = {
      name: config.projectName || "MERN Stack App",
      description: "A MERN stack application generated by MERN AI CLI",
      repository: "https://github.com/your-username/your-repo",
      logo: "https://cdn.jsdelivr.net/gh/heroku/node-js-getting-started@main/public/node.svg",
      keywords: ["node", "express", "react", "mongodb", "heroku"],
      image: "heroku/nodejs",
      addons: [
        "mongolab:sandbox"
      ],
      env: {
        JWT_SECRET: {
          generator: "secret"
        },
        NODE_ENV: {
          value: "production"
        }
      },
      scripts: {
        "heroku-prebuild": "./bin/heroku-prebuild"
      }
    };

    fs.writeFileSync(path.join(projectPath, 'app.json'), JSON.stringify(appJson, null, 2));

    return {
      platform: 'heroku',
      files: ['Procfile', 'app.json', 'bin/heroku-prebuild'],
      instructions: [
        '1. Install Heroku CLI',
        '2. Login: heroku login',
        '3. Create app: heroku create your-app-name',
        '4. Add MongoDB addon: heroku addons:create mongolab:sandbox',
        '5. Set environment variables: heroku config:set KEY=value',
        '6. Deploy: git push heroku main'
      ]
    };
  }

  /**
   * Setup Railway deployment
   */
  async setupRailway(projectPath, config) {
    const railwayJson = {
      build: {
        builder: "nixpacks"
      },
      deploy: {
        startCommand: "cd server && npm start",
        healthcheckPath: "/api/health"
      }
    };

    fs.writeFileSync(path.join(projectPath, 'railway.json'), JSON.stringify(railwayJson, null, 2));

    return {
      platform: 'railway',
      files: ['railway.json'],
      instructions: [
        '1. Install Railway CLI: npm i -g @railway/cli',
        '2. Login: railway login',
        '3. Initialize: railway init',
        '4. Deploy: railway up'
      ]
    };
  }

  /**
   * Setup Render deployment
   */
  async setupRender(projectPath, config) {
    const renderYaml = `databases:
  - name: ${config.projectName || 'app'}-db
    databaseName: ${config.projectName || 'app'}
    user: ${config.projectName || 'app'}

services:
  - type: web
    name: ${config.projectName || 'app'}-backend
    env: node
    plan: starter
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: ${config.projectName || 'app'}-db
          property: connectionString

  - type: web
    name: ${config.projectName || 'app'}-frontend
    env: static
    plan: starter
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: ./client/dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
`;

    fs.writeFileSync(path.join(projectPath, 'render.yaml'), renderYaml);

    return {
      platform: 'render',
      files: ['render.yaml'],
      instructions: [
        '1. Connect your repository to Render',
        '2. Create a new Blueprint',
        '3. Select render.yaml file',
        '4. Deploy your services'
      ]
    };
  }

  /**
   * Setup Docker deployment
   */
  async setupDocker(projectPath, config) {
    // Main Dockerfile
    const dockerfile = `# Multi-stage build for MERN stack application

# Build stage for client
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ ./
RUN npm run build

# Build stage for server
FROM node:18-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Copy server
COPY --from=server-build /app/server ./server
# Copy client build
COPY --from=client-build /app/client/dist ./client/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000

WORKDIR /app/server
CMD ["npm", "start"]
`;

    fs.writeFileSync(path.join(projectPath, 'Dockerfile'), dockerfile);

    // Docker Compose
    const dockerCompose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/${config.projectName || 'app'}
    depends_on:
      - mongodb
    restart: unless-stopped

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=${config.projectName || 'app'}
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
`;

    fs.writeFileSync(path.join(projectPath, 'docker-compose.yml'), dockerCompose);

    // Development Docker Compose
    const dockerComposeDev = `version: '3.8'

services:
  app:
    build: 
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "5000:5000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/client/node_modules
      - /app/server/node_modules
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/${config.projectName || 'app'}
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=${config.projectName || 'app'}

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
`;

    fs.writeFileSync(path.join(projectPath, 'docker-compose.dev.yml'), dockerComposeDev);

    // .dockerignore
    const dockerIgnore = `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.DS_Store
.vscode
.idea
*.log
`;

    fs.writeFileSync(path.join(projectPath, '.dockerignore'), dockerIgnore);

    return {
      platform: 'docker',
      files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.dev.yml', '.dockerignore'],
      instructions: [
        '1. Build image: docker build -t your-app .',
        '2. Run with compose: docker-compose up -d',
        '3. For development: docker-compose -f docker-compose.dev.yml up',
        '4. View logs: docker-compose logs -f'
      ]
    };
  }

  /**
   * Setup CI/CD workflows
   */
  async setupCICD(projectPath, config) {
    const cicdPlatform = config.deployment?.cicd || 'github-actions';
    
    switch (cicdPlatform) {
      case 'github-actions':
        return await this.setupGitHubActions(projectPath, config);
      case 'gitlab-ci':
        return await this.setupGitLabCI(projectPath, config);
      default:
        this.reporter.warn(`Unsupported CI/CD platform: ${cicdPlatform}`);
        return { success: false };
    }
  }

  /**
   * Setup GitHub Actions
   */
  async setupGitHubActions(projectPath, config) {
    const workflowsDir = path.join(projectPath, '.github', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });

    const workflow = `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        cd client && npm ci
        cd ../server && npm ci
    
    - name: Run tests
      run: |
        cd client && npm test
        cd ../server && npm test
      env:
        MONGODB_URI: mongodb://localhost:27017/test
        REDIS_URL: redis://localhost:6379
        JWT_SECRET: test-secret
    
    - name: Build client
      run: cd client && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: |
        echo "Add your deployment commands here"
        # Example for Vercel:
        # npx vercel --token \${{ secrets.VERCEL_TOKEN }} --prod
`;

    fs.writeFileSync(path.join(workflowsDir, 'ci-cd.yml'), workflow);

    return {
      platform: 'github-actions',
      files: ['.github/workflows/ci-cd.yml'],
      instructions: [
        '1. Add secrets to GitHub repository settings',
        '2. Configure deployment tokens',
        '3. Update deployment commands in workflow'
      ]
    };
  }

  /**
   * Generate Netlify TOML content
   */
  generateNetlifyToml(config) {
    return `[build]
  publish = "${config.build.publish}"
  command = "${config.build.command}"
  functions = "${config.functions.directory}"

${config.redirects.map(redirect => 
  `[[redirects]]
  from = "${redirect.from}"
  to = "${redirect.to}"
  status = ${redirect.status}`
).join('\n\n')}

${config.headers.map(header => 
  `[[headers]]
  for = "${header.for}"
  [headers.values]
${Object.entries(header.values).map(([key, value]) => `    ${key} = "${value}"`).join('\n')}`
).join('\n\n')}
`;
  }
}

module.exports = DeploymentSetup;
