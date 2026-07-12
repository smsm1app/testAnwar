const fs = require('fs');
const path = require('path');

const filesToFix = [
  'server.ts',
  'src/index.css',
  'src/components/POSScreen.tsx',
  'src/components/InstallmentsScreen.tsx',
  'src/components/EmployeesScreen.tsx',
  'src/App.tsx',
  'src/components/DashboardScreen.tsx'
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', file);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const regex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n[\s\S]*?>>>>>>> [^\r\n]+\r?\n/g;
  
  content = content.replace(regex, '$1');
  
  fs.writeFileSync(filePath, content);
  console.log('Fixed', file);
});
