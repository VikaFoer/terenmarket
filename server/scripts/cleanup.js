#!/usr/bin/env node

/**
 * Cleanup script for production
 * Removes:
 * - Old backup files
 * - Temporary files
 * - Cache files
 * - Old logs
 */

const fs = require('fs');
const path = require('path');

const MAX_LOG_AGE_DAYS = 7; // Keep logs for 7 days
const MAX_BACKUP_AGE_DAYS = 30; // Keep backups for 30 days

const cleanupConfig = {
  // Directories to clean
  directories: [
    {
      path: path.join(__dirname, '..', 'uploads', 'temp'),
      maxAgeDays: 1, // Clean temp files older than 1 day
      description: 'Temporary upload files'
    },
    {
      path: path.join(__dirname, '..', 'logs'),
      maxAgeDays: MAX_LOG_AGE_DAYS,
      description: 'Log files'
    },
    {
      path: path.join(__dirname, '..', 'backups'),
      maxAgeDays: MAX_BACKUP_AGE_DAYS,
      description: 'Backup files'
    }
  ],
  
  // File patterns to clean
  filePatterns: [
    {
      pattern: /\.backup$/i,
      maxAgeDays: MAX_BACKUP_AGE_DAYS,
      description: 'Backup files'
    },
    {
      pattern: /\.tmp$/i,
      maxAgeDays: 1,
      description: 'Temporary files'
    },
    {
      pattern: /\.old$/i,
      maxAgeDays: 7,
      description: 'Old files'
    },
    {
      pattern: /\.log$/i,
      maxAgeDays: MAX_LOG_AGE_DAYS,
      description: 'Log files'
    }
  ]
};

function getFileAge(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const now = Date.now();
    const fileTime = stats.mtime.getTime();
    return Math.floor((now - fileTime) / (1000 * 60 * 60 * 24)); // Days
  } catch (err) {
    return null;
  }
}

function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error(`Error deleting ${filePath}:`, err.message);
    return false;
  }
}

function cleanupDirectory(dirConfig) {
  if (!fs.existsSync(dirConfig.path)) {
    return { deleted: 0, errors: 0 };
  }

  let deleted = 0;
  let errors = 0;
  const now = Date.now();
  const maxAge = dirConfig.maxAgeDays * 24 * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(dirConfig.path);
    
    for (const file of files) {
      const filePath = path.join(dirConfig.path, file);
      
      try {
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          const fileAge = now - stats.mtime.getTime();
          
          if (fileAge > maxAge) {
            if (deleteFile(filePath)) {
              deleted++;
              console.log(`Deleted: ${filePath}`);
            } else {
              errors++;
            }
          }
        } else if (stats.isDirectory()) {
          // Recursively clean subdirectories
          const subDirConfig = { ...dirConfig, path: filePath };
          const result = cleanupDirectory(subDirConfig);
          deleted += result.deleted;
          errors += result.errors;
        }
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
        errors++;
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirConfig.path}:`, err.message);
    errors++;
  }

  return { deleted, errors };
}

function cleanupFilePatterns(rootDir, patterns) {
  let totalDeleted = 0;
  let totalErrors = 0;

  function scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        
        try {
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            // Skip node_modules and .git
            if (item === 'node_modules' || item === '.git' || item === 'build') {
              continue;
            }
            scanDirectory(itemPath);
          } else if (stats.isFile()) {
            // Check if file matches any pattern
            for (const patternConfig of patterns) {
              if (patternConfig.pattern.test(item)) {
                const fileAge = getFileAge(itemPath);
                
                if (fileAge !== null && fileAge > patternConfig.maxAgeDays) {
                  if (deleteFile(itemPath)) {
                    totalDeleted++;
                    console.log(`Deleted ${patternConfig.description}: ${itemPath}`);
                  } else {
                    totalErrors++;
                  }
                }
                break; // Only match first pattern
              }
            }
          }
        } catch (err) {
          // Skip files we can't access
        }
      }
    } catch (err) {
      // Skip directories we can't access
    }
  }

  scanDirectory(rootDir);
  return { deleted: totalDeleted, errors: totalErrors };
}

function cleanupCache() {
  const cacheDirs = [
    path.join(__dirname, '..', '..', '.cache'),
    path.join(__dirname, '..', '..', 'client', '.cache'),
    path.join(__dirname, '..', '..', 'client', 'node_modules', '.cache'),
    path.join(__dirname, '..', '.cache'),
    path.join(__dirname, '..', '..', '.npm'),
  ];

  let deleted = 0;
  let errors = 0;

  for (const cacheDir of cacheDirs) {
    if (fs.existsSync(cacheDir)) {
      try {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        deleted++;
        console.log(`Deleted cache directory: ${cacheDir}`);
      } catch (err) {
        console.error(`Error deleting cache ${cacheDir}:`, err.message);
        errors++;
      }
    }
  }

  return { deleted, errors };
}

function main() {
  console.log('🧹 Starting cleanup...\n');

  let totalDeleted = 0;
  let totalErrors = 0;

  // Cleanup directories
  console.log('📁 Cleaning directories...');
  for (const dirConfig of cleanupConfig.directories) {
    console.log(`\nCleaning ${dirConfig.description} (${dirConfig.path})...`);
    const result = cleanupDirectory(dirConfig);
    totalDeleted += result.deleted;
    totalErrors += result.errors;
    console.log(`  Deleted: ${result.deleted}, Errors: ${result.errors}`);
  }

  // Cleanup file patterns
  console.log('\n📄 Cleaning file patterns...');
  const rootDir = path.join(__dirname, '..', '..');
  const patternResult = cleanupFilePatterns(rootDir, cleanupConfig.filePatterns);
  totalDeleted += patternResult.deleted;
  totalErrors += patternResult.errors;
  console.log(`  Deleted: ${patternResult.deleted}, Errors: ${patternResult.errors}`);

  // Cleanup cache
  console.log('\n🗑️  Cleaning cache directories...');
  const cacheResult = cleanupCache();
  totalDeleted += cacheResult.deleted;
  totalErrors += cacheResult.errors;
  console.log(`  Deleted cache dirs: ${cacheResult.deleted}, Errors: ${cacheResult.errors}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Cleanup completed!');
  console.log(`   Total files/dirs deleted: ${totalDeleted}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log('='.repeat(50));
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { 
  cleanupDirectory, 
  cleanupFilePatterns, 
  cleanupCache,
  main // Export main for cron usage
};

