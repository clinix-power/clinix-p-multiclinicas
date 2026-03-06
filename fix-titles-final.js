const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

console.log('Updating section titles...');

// Title 1: "Tudo que você precisa em um só lugar"
content = content.replace(
  `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>\r\n              Tudo que você precisa em um só lugar\r\n            </h2>`,
  `            <h2 style={{ \r\n              fontFamily: '"Outfit", sans-serif',\r\n              fontSize: 'clamp(2rem, 4vw, 3rem)',\r\n              fontWeight: 900,\r\n              letterSpacing: '-.055em',\r\n              background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 45%, #818cf8 100%)',\r\n              WebkitBackgroundClip: 'text',\r\n              WebkitTextFillColor: 'transparent',\r\n              backgroundClip: 'text',\r\n              marginBottom: '1rem'\r\n            }}>\r\n              Tudo que você precisa em um só lugar\r\n            </h2>`
);

// Title 2: "Escolha o plano ideal para sua clínica"
content = content.replace(
  `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>\r\n              Escolha o plano ideal para sua clínica\r\n            </h2>`,
  `            <h2 style={{ \r\n              fontFamily: '"Outfit", sans-serif',\r\n              fontSize: 'clamp(2rem, 4vw, 3rem)',\r\n              fontWeight: 900,\r\n              letterSpacing: '-.055em',\r\n              background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 45%, #818cf8 100%)',\r\n              WebkitBackgroundClip: 'text',\r\n              WebkitTextFillColor: 'transparent',\r\n              backgroundClip: 'text',\r\n              marginBottom: '1rem'\r\n            }}>\r\n              Escolha o plano ideal para sua clínica\r\n            </h2>`
);

// Title 3: "O que dizem nossos clientes"
content = content.replace(
  `            <h2 className="font-bold mb-4" style={{ fontSize: '1.4rem', letterSpacing: '-.04em', color: 'rgba(18,18,28,.92)' }}>\r\n              O que dizem nossos clientes\r\n            </h2>`,
  `            <h2 style={{ \r\n              fontFamily: '"Outfit", sans-serif',\r\n              fontSize: 'clamp(2rem, 4vw, 3rem)',\r\n              fontWeight: 900,\r\n              letterSpacing: '-.055em',\r\n              background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 45%, #818cf8 100%)',\r\n              WebkitBackgroundClip: 'text',\r\n              WebkitTextFillColor: 'transparent',\r\n              backgroundClip: 'text',\r\n              marginBottom: '1rem'\r\n            }}>\r\n              O que dizem nossos clientes\r\n            </h2>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('✓ All 3 section titles updated!');
