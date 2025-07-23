const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const AIOrchestrator = require('../core/aiOrchestrator');

/**
 * Generate command for creating components, APIs, models, and features
 */
async function generateCommand(type, name, options, reporter) {
  reporter.info(`Starting generation: ${chalk.cyan(type)} - ${chalk.cyan(name)}`);

  try {
    // Validate current directory is a MERN project
    if (!isValidMernProject()) {
      throw new Error('This command must be run in a MERN project directory');
    }

    const aiOrchestrator = new AIOrchestrator(reporter, {
      aiApiKey: options.aiKey || process.env.OPENAI_API_KEY,
      aiModel: options.aiModel || 'gpt-4'
    });

    const projectPath = process.cwd();
    let result;

    switch (type.toLowerCase()) {
      case 'component':
        result = await generateComponent(aiOrchestrator, name, options, projectPath);
        break;
      case 'api':
        result = await generateAPI(aiOrchestrator, name, options, projectPath);
        break;
      case 'model':
        result = await generateModel(aiOrchestrator, name, options, projectPath);
        break;
      case 'feature':
        result = await generateFeature(aiOrchestrator, name, options, projectPath);
        break;
      default:
        throw new Error(`Unknown generation type: ${type}`);
    }

    if (result.success) {
      reporter.success(`${type} '${name}' generated successfully!`);
      
      // Show next steps
      if (result.files && result.files.length > 0) {
        reporter.info('Generated files:');
        result.files.forEach(file => {
          reporter.info(`  ${chalk.cyan(file)}`);
        });
      }

      if (result.nextSteps) {
        reporter.info('\nNext steps:');
        result.nextSteps.forEach((step, index) => {
          reporter.info(`  ${index + 1}. ${step}`);
        });
      }
    } else {
      throw new Error(result.error || 'Generation failed');
    }

    return result;

  } catch (error) {
    reporter.error(`Generation failed: ${error.message}`);
    
    if (error.message.includes('API key')) {
      reporter.info('To use AI generation, set your OpenAI API key:');
      reporter.info('  export OPENAI_API_KEY=your-api-key');
      reporter.info('  or use --ai-key flag');
    }
    
    throw error;
  }
}

/**
 * Generate a React component
 */
async function generateComponent(aiOrchestrator, name, options, projectPath) {
  const specifications = {
    description: options.description || `A ${name} component`,
    props: options.props ? JSON.parse(options.props) : {},
    features: options.features ? options.features.split(',') : [],
    styling: options.styling || 'tailwind'
  };

  const generateOptions = {
    framework: 'react',
    type: options.type || 'functional',
    styling: options.styling || 'tailwind',
    typescript: options.typescript !== false
  };

  const result = await aiOrchestrator.generateComponent(name, specifications, generateOptions);

  if (result.success) {
    // Determine file paths
    const componentDir = path.join(projectPath, 'client', 'src', 'components');
    const componentFile = `${name}.${generateOptions.typescript ? 'tsx' : 'jsx'}`;
    const testFile = `${name}.test.${generateOptions.typescript ? 'tsx' : 'jsx'}`;

    // Create component directory if it doesn't exist
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }

    const filesToCreate = {};
    
    // Component file
    filesToCreate[path.join(componentDir, componentFile)] = result.code;
    
    // Test file
    if (result.tests) {
      const testDir = path.join(componentDir, '__tests__');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      filesToCreate[path.join(testDir, testFile)] = result.tests;
    }

    // Save files
    const saveResult = await aiOrchestrator.saveGeneratedCode(projectPath, filesToCreate);

    return {
      success: true,
      files: saveResult.savedFiles,
      nextSteps: [
        `Import the component: import ${name} from './components/${name}'`,
        'Add the component to your JSX',
        'Run tests: npm test',
        'Update styles if needed'
      ]
    };
  }

  return result;
}

/**
 * Generate an API endpoint
 */
async function generateAPI(aiOrchestrator, name, options, projectPath) {
  const specifications = {
    description: options.description || `API endpoint for ${name}`,
    methods: options.methods ? options.methods.split(',') : ['GET', 'POST'],
    authentication: options.auth !== false,
    validation: options.validation !== false,
    database: options.database || 'mongodb'
  };

  const generateOptions = {
    method: options.method || 'GET',
    database: options.database || 'mongodb',
    authentication: options.auth !== false
  };

  const result = await aiOrchestrator.generateAPIEndpoint(name, specifications, generateOptions);

  if (result.success) {
    const serverDir = path.join(projectPath, 'server', 'src');
    const filesToCreate = {};

    // Controller
    if (result.controller) {
      const controllerDir = path.join(serverDir, 'controllers');
      if (!fs.existsSync(controllerDir)) {
        fs.mkdirSync(controllerDir, { recursive: true });
      }
      filesToCreate[path.join(controllerDir, `${name.toLowerCase()}.controller.js`)] = result.controller;
    }

    // Route
    if (result.route) {
      const routesDir = path.join(serverDir, 'routes');
      if (!fs.existsSync(routesDir)) {
        fs.mkdirSync(routesDir, { recursive: true });
      }
      filesToCreate[path.join(routesDir, `${name.toLowerCase()}.routes.js`)] = result.route;
    }

    // Model
    if (result.model) {
      const modelsDir = path.join(serverDir, 'models');
      if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
      }
      filesToCreate[path.join(modelsDir, `${name.toLowerCase()}.model.js`)] = result.model;
    }

    // Tests
    if (result.tests) {
      const testsDir = path.join(serverDir, '__tests__');
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }
      filesToCreate[path.join(testsDir, `${name.toLowerCase()}.test.js`)] = result.tests;
    }

    const saveResult = await aiOrchestrator.saveGeneratedCode(projectPath, filesToCreate);

    return {
      success: true,
      files: saveResult.savedFiles,
      nextSteps: [
        'Add the route to your main app.js',
        'Test the endpoint with Postman or similar',
        'Run tests: npm test',
        'Update documentation'
      ]
    };
  }

  return result;
}

/**
 * Generate a database model
 */
async function generateModel(aiOrchestrator, name, options, projectPath) {
  const fields = options.fields ? JSON.parse(options.fields) : {
    name: { type: 'String', required: true },
    email: { type: 'String', required: true, unique: true }
  };

  const specifications = {
    description: options.description || `Database model for ${name}`,
    fields,
    relationships: options.relationships ? JSON.parse(options.relationships) : []
  };

  const generateOptions = {
    database: options.database || 'mongodb',
    relationships: options.relationships ? JSON.parse(options.relationships) : []
  };

  const result = await aiOrchestrator.generateModel(name, fields, generateOptions);

  if (result.success) {
    const serverDir = path.join(projectPath, 'server', 'src');
    const filesToCreate = {};

    // Model file
    if (result.schema) {
      const modelsDir = path.join(serverDir, 'models');
      if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
      }
      filesToCreate[path.join(modelsDir, `${name.toLowerCase()}.model.js`)] = result.schema;
    }

    // Migration (if applicable)
    if (result.migration) {
      const migrationsDir = path.join(serverDir, 'migrations');
      if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filesToCreate[path.join(migrationsDir, `${timestamp}-create-${name.toLowerCase()}.js`)] = result.migration;
    }

    // Tests
    if (result.tests) {
      const testsDir = path.join(serverDir, '__tests__');
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir, { recursive: true });
      }
      filesToCreate[path.join(testsDir, `${name.toLowerCase()}.model.test.js`)] = result.tests;
    }

    const saveResult = await aiOrchestrator.saveGeneratedCode(projectPath, filesToCreate);

    return {
      success: true,
      files: saveResult.savedFiles,
      nextSteps: [
        'Import the model in your controllers',
        'Run database migration if applicable',
        'Run tests: npm test',
        'Update API endpoints to use the model'
      ]
    };
  }

  return result;
}

/**
 * Generate a complete feature (component + API + model)
 */
async function generateFeature(aiOrchestrator, name, options, projectPath) {
  const specifications = {
    description: options.description || `Complete ${name} feature`,
    frontend: {
      components: [
        {
          name: `${name}List`,
          specifications: { description: `List all ${name} items` }
        },
        {
          name: `${name}Form`,
          specifications: { description: `Create/edit ${name} items` }
        },
        {
          name: `${name}Detail`,
          specifications: { description: `Show ${name} details` }
        }
      ]
    },
    backend: {
      models: [
        {
          name,
          fields: options.fields ? JSON.parse(options.fields) : {
            name: { type: 'String', required: true },
            description: { type: 'String' },
            status: { type: 'String', enum: ['active', 'inactive'], default: 'active' }
          }
        }
      ],
      endpoints: [
        {
          name: `${name}API`,
          specifications: {
            description: `CRUD operations for ${name}`,
            methods: ['GET', 'POST', 'PUT', 'DELETE']
          }
        }
      ]
    }
  };

  const generateOptions = {
    frontend: {
      framework: 'react',
      styling: options.styling || 'tailwind',
      typescript: options.typescript !== false
    },
    backend: {
      database: options.database || 'mongodb',
      authentication: options.auth !== false
    }
  };

  const result = await aiOrchestrator.generateFeature(name, specifications, generateOptions);

  if (result.success) {
    const allFiles = [];

    // Save all generated files
    for (const component of result.components) {
      if (component.success) {
        const componentDir = path.join(projectPath, 'client', 'src', 'components', name);
        if (!fs.existsSync(componentDir)) {
          fs.mkdirSync(componentDir, { recursive: true });
        }

        const componentFile = `${component.componentName}.tsx`;
        fs.writeFileSync(path.join(componentDir, componentFile), component.code);
        allFiles.push(`client/src/components/${name}/${componentFile}`);

        if (component.tests) {
          const testDir = path.join(componentDir, '__tests__');
          if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
          }
          const testFile = `${component.componentName}.test.tsx`;
          fs.writeFileSync(path.join(testDir, testFile), component.tests);
          allFiles.push(`client/src/components/${name}/__tests__/${testFile}`);
        }
      }
    }

    // Save API files
    for (const api of result.apis) {
      if (api.success) {
        const serverDir = path.join(projectPath, 'server', 'src');

        if (api.controller) {
          const controllerFile = `${name.toLowerCase()}.controller.js`;
          fs.writeFileSync(path.join(serverDir, 'controllers', controllerFile), api.controller);
          allFiles.push(`server/src/controllers/${controllerFile}`);
        }

        if (api.route) {
          const routeFile = `${name.toLowerCase()}.routes.js`;
          fs.writeFileSync(path.join(serverDir, 'routes', routeFile), api.route);
          allFiles.push(`server/src/routes/${routeFile}`);
        }
      }
    }

    // Save model files
    for (const model of result.models) {
      if (model.success) {
        const modelFile = `${name.toLowerCase()}.model.js`;
        fs.writeFileSync(
          path.join(projectPath, 'server', 'src', 'models', modelFile),
          model.schema
        );
        allFiles.push(`server/src/models/${modelFile}`);
      }
    }

    // Save feature documentation
    if (result.documentation) {
      const docsDir = path.join(projectPath, 'docs', 'features');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }
      const docFile = `${name.toLowerCase()}.md`;
      fs.writeFileSync(path.join(docsDir, docFile), result.documentation);
      allFiles.push(`docs/features/${docFile}`);
    }

    return {
      success: true,
      files: allFiles,
      nextSteps: [
        'Add the routes to your main app.js',
        'Import and use the components in your pages',
        'Run tests: npm test',
        'Update navigation to include the new feature',
        'Check the generated documentation in docs/features/'
      ]
    };
  }

  return result;
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
  generateCommand,
  generateComponent,
  generateAPI,
  generateModel,
  generateFeature,
  isValidMernProject
};
