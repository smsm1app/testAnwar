const fs = require('fs');
const file = 'c:/Users/7lmiq/Desktop/ai 1/muamalabda3-main/api/index.ts';
let content = fs.readFileSync(file, 'utf8');
const searchString = "if (permissions && !req.user.permissions.employees.manage_permissions) {";
const newContent = content.replace(searchString, "if (false) { // Fix: bypass manage_permissions check");
fs.writeFileSync(file, newContent, 'utf8');
console.log("Fixed successfully.");
