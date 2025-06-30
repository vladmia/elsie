import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper functions to promisify fs methods
const readdir = (dir) => fs.promises.readdir(dir);
const readFile = (file) => fs.promises.readFile(file, 'utf8');
const writeFile = (file, content) => fs.promises.writeFile(file, content, 'utf8');
const stat = (path) => fs.promises.stat(path);

// Define patterns to match $ symbols that are likely to be prices
// This includes patterns like $123, $123.45, etc.
const patterns = [
  // Common price formats with $ symbol
  { pattern: /(\s)\$(\d+(\.\d+)?)/g, replacement: '$1KSh $2' },
  { pattern: /(^|\(|\[|{|,|;|:)\$(\d+(\.\d+)?)/g, replacement: '$1KSh $2' },
  
  // EJS template price formats like <%= parseFloat(product.price).toFixed(2) %>
  { 
    pattern: /\$\s*<%=\s*([^%]+)\s*%>/g, 
    replacement: 'KSh <%= $1 %>' 
  },
  
  // Handle cases where $ is inside a string like "$" + price
  { pattern: /"\$"\s*\+/g, replacement: '"KSh" +' },
  { pattern: /'\$'\s*\+/g, replacement: "'KSh' +" },
  
  // Handle cases in JavaScript like '$' + price
  { pattern: /(\W|^)\$(['"`])/g, replacement: '$1KSh$2' },
  
  // Handle plain $ symbols in text/HTML (like in <p class="text-sm font-medium text-gray-900">$25.00</p>)
  { pattern: />(\s*)\$(\d+(\.\d+)?)/g, replacement: '>$1KSh $2' }
];

async function processFile(filePath) {
  try {
    // Read the file content
    const content = await readFile(filePath);
    
    // Check if the file contains $ symbol
    if (!content.includes('$')) {
      return { filePath, changed: false, message: 'No $ symbols found' };
    }
    
    console.log(`Processing ${filePath}...`);
    
    // Apply all replacement patterns
    let newContent = content;
    let changed = false;
    let replacements = 0;
    
    patterns.forEach(({ pattern, replacement }) => {
      const before = newContent;
      newContent = newContent.replace(pattern, replacement);
      
      // Count replacements
      if (before !== newContent) {
        changed = true;
        const matchCount = (before.match(pattern) || []).length;
        replacements += matchCount;
        console.log(`  - Applied pattern: ${pattern} (${matchCount} matches)`);
      }
    });
    
    // If changes were made, write the file
    if (changed) {
      await writeFile(filePath, newContent);
      return { 
        filePath, 
        changed: true, 
        replacements,
        message: `Updated successfully (${replacements} replacements)` 
      };
    } else {
      return { 
        filePath, 
        changed: false, 
        message: '$ symbols found but not in price format' 
      };
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return { filePath, changed: false, message: `Error: ${error.message}` };
  }
}

async function walkDir(dir) {
  console.log(`Scanning directory: ${dir}`);
  const results = [];
  
  try {
    const entries = await readdir(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        // Recursively process subdirectories
        const subResults = await walkDir(fullPath);
        results.push(...subResults);
      } else if (entry.endsWith('.ejs')) {
        // Process EJS files
        const result = await processFile(fullPath);
        results.push(result);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return results;
}

async function main() {
  console.log('Starting currency symbol replacement...');
  
  try {
    const viewsDir = path.join(__dirname, 'frontend', 'views');
    console.log(`Views directory: ${viewsDir}`);
    
    // Check if directory exists
    try {
      await stat(viewsDir);
    } catch (error) {
      console.error(`Error: Views directory not found at ${viewsDir}`);
      console.log('Current directory:', __dirname);
      return;
    }
    
    const results = await walkDir(viewsDir);
    
    // Count statistics
    const processed = results.length;
    const changed = results.filter(r => r.changed).length;
    const totalReplacements = results.reduce((sum, r) => sum + (r.replacements || 0), 0);
    
    console.log('\nSummary:');
    console.log(`Processed ${processed} EJS files`);
    console.log(`Updated ${changed} files`);
    console.log(`Made ${totalReplacements} replacements`);
    
    // List all changed files
    if (changed > 0) {
      console.log('\nChanged files:');
      results
        .filter(r => r.changed)
        .forEach(r => console.log(`- ${r.filePath}: ${r.message}`));
    }
    
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
main(); 