const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add 6th phrase to typewriter
content = content.replace(
  "    'Agenda inteligente'\n  ]",
  "    'Agenda inteligente',\n    'IA Consultora Financeira'\n  ]"
);

fs.writeFileSync(file, content, 'utf8');
console.log('✓ 6th phrase added!');
