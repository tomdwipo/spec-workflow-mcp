#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Validation script to ensure locale files exist and are valid
function validateI18nFiles() {
  console.log('🔍 Validating i18n files...');
  
  const errors = [];
  const warnings = [];
  
  // Check backend locale files
  const backendLocalesDir = path.resolve(__dirname, '../src/locales');
  const backendFiles = ['en.json', 'ja.json'];
  
  console.log(`📁 Checking backend locales in: ${backendLocalesDir}`);
  
  if (!fs.existsSync(backendLocalesDir)) {
    errors.push(`Backend locales directory not found: ${backendLocalesDir}`);
  } else {
    for (const file of backendFiles) {
      const filePath = path.join(backendLocalesDir, file);
      
      if (!fs.existsSync(filePath)) {
        warnings.push(`Backend locale file missing: ${file} (will use fallback)`);
      } else {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          JSON.parse(content);
          console.log(`✅ Backend ${file}: Valid JSON`);
        } catch (parseError) {
          errors.push(`Backend ${file}: Invalid JSON - ${parseError.message}`);
        }
      }
    }
  }
  
  // Check frontend locale files
  const frontendLocalesDir = path.resolve(__dirname, '../src/dashboard_frontend/src/locales');
  const frontendFiles = ['en.json', 'ja.json'];
  
  console.log(`📁 Checking frontend locales in: ${frontendLocalesDir}`);
  
  if (!fs.existsSync(frontendLocalesDir)) {
    errors.push(`Frontend locales directory not found: ${frontendLocalesDir}`);
  } else {
    for (const file of frontendFiles) {
      const filePath = path.join(frontendLocalesDir, file);
      
      if (!fs.existsSync(filePath)) {
        errors.push(`Frontend locale file missing: ${file}`);
      } else {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          JSON.parse(content);
          console.log(`✅ Frontend ${file}: Valid JSON`);
        } catch (parseError) {
          errors.push(`Frontend ${file}: Invalid JSON - ${parseError.message}`);
        }
      }
    }
  }
  
  // Check VSCode extension locale files
  const vscodeLocalesDir = path.resolve(__dirname, '../vscode-extension/src/webview/locales');
  const vscodeFiles = ['en.json', 'ja.json'];
  
  console.log(`📁 Checking VSCode extension locales in: ${vscodeLocalesDir}`);
  
  if (!fs.existsSync(vscodeLocalesDir)) {
    warnings.push(`VSCode extension locales directory not found: ${vscodeLocalesDir}`);
  } else {
    for (const file of vscodeFiles) {
      const filePath = path.join(vscodeLocalesDir, file);
      
      if (!fs.existsSync(filePath)) {
        warnings.push(`VSCode extension locale file missing: ${file}`);
      } else {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          JSON.parse(content);
          console.log(`✅ VSCode ${file}: Valid JSON`);
        } catch (parseError) {
          errors.push(`VSCode ${file}: Invalid JSON - ${parseError.message}`);
        }
      }
    }
  }
  
  // Report results
  console.log('\n📊 Validation Results:');
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(error => console.log(`   ${error}`));
    console.log('\n🚫 Build should not proceed with these i18n errors.');
    process.exit(1);
  } else {
    console.log('\n✅ All i18n files are valid!');
    if (warnings.length > 0) {
      console.log('⚠️  There are warnings, but the build can proceed with fallbacks.');
    }
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateI18nFiles();
}

module.exports = { validateI18nFiles };