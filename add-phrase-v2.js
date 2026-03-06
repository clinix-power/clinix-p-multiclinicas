const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Try both line ending styles
content = content.replace(
  "    'Agenda inteligente'\r\n  ]",
  "    'Agenda inteligente',\r\n    'IA Consultora Financeira'\r\n  ]"
);

// Fallback to \n if \r\n didn't work
if (!content.includes("'IA Consultora Financeira'")) {
  content = content.replace(
    "    'Agenda inteligente'\n  ]",
    "    'Agenda inteligente',\n    'IA Consultora Financeira'\n  ]"
  );
}

fs.writeFileSync(file, content, 'utf8');
console.log('✓ 6th phrase added to typewriter!');
