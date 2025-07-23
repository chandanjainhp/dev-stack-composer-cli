const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const DeploymentSetup = require('../setup/deploymentSetup');

/**
 * Deploy command for deploying MERN applications to various platforms
 */
async function deployCommand(platform, options, reporter) {
  reporter.info(`Starting deployment to ${chalk.cyan(platform)}...`);

  try {
    // Validate current directory is a MERN project
    if (!isValidMernProject()) {
      throw new Error('This command must be run in a MERN project directory');
    }

    const projectPath = process.cwd();
    const deploymentSetup = new DeploymentSetup(reporter);

    // Read project configuration
    const config = await readProjectConfig(projectPath);
    
    // Override platform from command
    if (platform) {
      config.deployment = config.deployment || {};
      config.deployment.platform = platform;
    }

    // Apply command options
    if (options.environment) {
      config.deployment.environment = options.environment;
    }

    if (options.cicd) {
      config.deployment.cicd = options.cicd;
    }

    let result;

    switch (platform.toLowerCase()) {
      case 'vercel':
        result = await deployToVercel(deploymentSetup, projectPath, config, options);
        break;
      case 'netlify':
        result = await deployToNetlify(deploymentSetup, projectPath, config, options);
        break;
      case 'heroku':
        result = await deployToHeroku(deploymentSetup, projectPath, config, options);
        break;
      case 'railway':
        result = await deployToRailway(deploymentSetup, projectPath, config, options);
        break;
      case 'render':
        result = await deployToRender(deploymentSetup, projectPath, config, options);
        break;
      case 'docker':
        result = await deployToDocker(deploymentSetup, projectPath, config, options);
        break;
      case 'aws':
        result = await deployToAWS(deploymentSetup, projectPath, config, options);
        break;
      default:
        throw new Error(`Unsupported deployment platform: ${platform}`);
    }

    if (result.success) {
      reporter.success(`Deployment to ${platform} configured successfully!`);
      
      if (result.instructions && result.instructions.length > 0) {
        reporter.info('\nNext steps:');
        result.instructions.forEach((instruction, index) => {
          reporter.info(`  ${index + 1}. ${instruction}`);
        });
      }

      if (result.url) {
        reporter.info(`\nDeployment URL: ${chalk.cyan(result.url)}`);
      }
    } else {
      throw new Error(result.error || 'Deployment configuration failed');
    }

    return result;

  } catch (error) {
    reporter.error(`Deployment failed: ${error.message}`);
    throw error;
  }
}

/**
 * Deploy to Vercel
 */
async function deployToVercel(deploymentSetup, projectPath, config, options) {
  // Setup Vercel configuration
  const setupResult = await deploymentSetup.setupVercel(projectPath, config);

  if (options.deploy) {
    const { execSync } = require('child_process');
    
    try {
      // Check if Vercel CLI is installed
      execSync('vercel --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('Vercel CLI is not installed. Run: npm i -g vercel');
    }

    try {
      // Deploy to Vercel
      const deployCommand = options.production ? 'vercel --prod' : 'vercel';
      const output = execSync(deployCommand, { 
        cwd: projectPath,
        encoding: 'utf8'
      });

      const urlMatch = output.match(/https:\/\/[^\s]+/);
      const deploymentUrl = urlMatch ? urlMatch[0] : null;

      return {
        success: true,
        platform: 'vercel',
        url: deploymentUrl,
        instructions: setupResult.instructions
      };

    } catch (error) {
      throw new Error(`Vercel deployment failed: ${error.message}`);
    }
  }

  return {
    success: true,
    platform: 'vercel',
    instructions: setupResult.instructions
  };
}

/**
 * Deploy to Netlify
 */
async function deployToNetlify(deploymentSetup, projectPath, config, options) {
  const setupResult = await deploymentSetup.setupNetlify(projectPath, config);

  if (options.deploy) {
    const { execSync } = require('child_process');
    
    try {
      execSync('netlify --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('Netlify CLI is not installed. Run: npm i -g netlify-cli');
    }

    try {
      // Build the project first
      execSync('cd client && npm run build', { 
        cwd: projectPath,
        stdio: 'inherit'
      });

      // Deploy to Netlify
      const deployCommand = options.production ? 'netlify deploy --prod' : 'netlify deploy';
      const output = execSync(deployCommand, { 
        cwd: projectPath,
        encoding: 'utf8'
      });

      const urlMatch = output.match(/https:\/\/[^\s]+/);
      const deploymentUrl = urlMatch ? urlMatch[0] : null;

      return {
        success: true,
        platform: 'netlify',
        url: deploymentUrl,
        instructions: setupResult.instructions
      };

    } catch (error) {
      throw new Error(`Netlify deployment failed: ${error.message}`);
    }
  }

  return {
    success: true,
    platform: 'netlify',
    instructions: setupResult.instructions
  };
}

/**
 * Deploy to Heroku
 */
async function deployToHeroku(deploymentSetup, projectPath, config, options) {
  const setupResult = await deploymentSetup.setupHeroku(projectPath, config);

  if (options.deploy) {
    const { execSync } = require('child_process');
    
    try {
      execSync('heroku --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('Heroku CLI is not installed. Visit: https://devcenter.heroku.com/articles/heroku-cli');
    }

    try {
      const appName = options.app || `${config.projectName || 'mern-app'}-${Date.now()}`;
      
      // Create Heroku app if it doesn't exist
      try {
        execSync(`heroku create ${appName}`, { 
          cwd: projectPath,
          stdio: 'inherit'
        });
      } catch (error) {
        // App might already exist
        console.log('Note: Heroku app might already exist');
      }

      // Add MongoDB addon
      try {
        execSync(`heroku addons:create mongolab:sandbox -a ${appName}`, { 
          cwd: projectPath,
          stdio: 'inherit'
        });
      } catch (error) {
        console.log('Note: MongoDB addon might already exist');
      }

      // Set environment variables
      if (fs.existsSync(path.join(projectPath, '.env'))) {
        const envContent = fs.readFileSync(path.join(projectPath, '.env'), 'utf8');
        const envVars = envContent.split('\n')
          .filter(line => line.includes('=') && !line.startsWith('#'))
          .map(line => {
            const [key, value] = line.split('=');
            return `${key}=${value}`;
          })
          .join(' ');

        if (envVars) {
          execSync(`heroku config:set ${envVars} -a ${appName}`, { 
            cwd: projectPath,
            stdio: 'inherit'
          });
        }
      }

      // Deploy
      execSync('git add .', { cwd: projectPath, stdio: 'inherit' });
      try {
        execSync('git commit -m "Deploy to Heroku"', { cwd: projectPath, stdio: 'inherit' });
      } catch (error) {
        // No changes to commit
      }
      
      execSync(`git push heroku main -a ${appName}`, { 
        cwd: projectPath,
        stdio: 'inherit'
      });

      const deploymentUrl = `https://${appName}.herokuapp.com`;

      return {
        success: true,
        platform: 'heroku',
        url: deploymentUrl,
        instructions: [...setupResult.instructions, `App created: ${appName}`]
      };

    } catch (error) {
      throw new Error(`Heroku deployment failed: ${error.message}`);
    }
  }

  return {
    success: true,
    platform: 'heroku',
    instructions: setupResult.instructions
  };
}

/**
 * Deploy to Railway
 */
async function deployToRailway(deploymentSetup, projectPath, config, options) {
  const setupResult = await deploymentSetup.setupRailway(projectPath, config);

  if (options.deploy) {
    const { execSync } = require('child_process');
    
    try {
      execSync('railway --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('Railway CLI is not installed. Run: npm i -g @railway/cli');
    }

    try {
      // Initialize Railway project
      execSync('railway login', { cwd: projectPath, stdio: 'inherit' });
      execSync('railway init', { cwd: projectPath, stdio: 'inherit' });
      
      // Deploy
      execSync('railway up', { cwd: projectPath, stdio: 'inherit' });

      return {
        success: true,
        platform: 'railway',
        instructions: [...setupResult.instructions, 'Check Railway dashboard for deployment URL']
      };

    } catch (error) {
      throw new Error(`Railway deployment failed: ${error.message}`);
    }
  }

  return {
    success: true,
    platform: 'railway',
    instructions: setupResult.instructions
  };
}

/**
 * Deploy to Render
 */
async function deployToRender(deploymentSetup, projectPath, config, options) {
  const setupResult = await deploymentSetup.setupRender(projectPath, config);

  return {
    success: true,
    platform: 'render',
    instructions: [
      ...setupResult.instructions,
      'Connect your repository to Render',
      'Create a new Blueprint service',
      'Select the render.yaml file for configuration'
    ]
  };
}

/**
 * Deploy using Docker
 */
async function deployToDocker(deploymentSetup, projectPath, config, options) {
  const setupResult = await deploymentSetup.setupDocker(projectPath, config);

  if (options.deploy) {
    const { execSync } = require('child_process');
    
    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('Docker is not installed. Visit: https://docs.docker.com/get-docker/');
    }

    try {
      const imageName = options.image || `${config.projectName || 'mern-app'}:latest`;
      
      // Build Docker image
      execSync(`docker build -t ${imageName} .`, { 
        cwd: projectPath,
        stdio: 'inherit'
      });

      if (options.run) {
        // Run the container
        execSync(`docker run -p 5000:5000 -d ${imageName}`, { 
          cwd: projectPath,
          stdio: 'inherit'
        });
      }

      return {
        success: true,
        platform: 'docker',
        instructions: [
          ...setupResult.instructions,
          `Docker image built: ${imageName}`,
          `Run container: docker run -p 5000:5000 ${imageName}`
        ]
      };

    } catch (error) {
      throw new Error(`Docker deployment failed: ${error.message}`);
    }
  }

  return {
    success: true,
    platform: 'docker',
    instructions: setupResult.instructions
  };
}

/**
 * Deploy to AWS (placeholder)
 */
async function deployToAWS(deploymentSetup, projectPath, config, options) {
  // This would implement AWS deployment (ECS, Lambda, etc.)
  return {
    success: true,
    platform: 'aws',
    instructions: [
      'AWS deployment configuration generated',
      'Set up AWS CLI and configure credentials',
      'Review and customize the deployment scripts',
      'Run deployment commands'
    ]
  };
}

/**
 * Read project configuration
 */
async function readProjectConfig(projectPath) {
  const configPath = path.join(projectPath, 'mern-ai-config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.warn('Failed to parse project configuration, using defaults');
    }
  }

  // Return default configuration
  return {
    projectName: path.basename(projectPath),
    deployment: {
      platform: 'vercel',
      environment: 'production'
    }
  };
}

/**
 * Check if the current directory is a valid MERN project
 */
function isValidMernProject() {
  const requiredDirs = ['client', 'server'];
  const requiredFiles = ['client/package.json', 'server/package.json'];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      return false;
    }
  }

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      return false;
    }
  }

  return true;
}

module.exports = {
  deployCommand,
  deployToVercel,
  deployToNetlify,
  deployToHeroku,
  deployToRailway,
  deployToRender,
  deployToDocker,
  deployToAWS,
  isValidMernProject
};
