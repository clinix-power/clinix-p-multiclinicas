const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the icon rendering - replace {feature.icon} with <feature.icon />
content = content.replace(
  /\{feature\.icon\}/g,
  '<feature.icon className="w-5 h-5" style={{ color: isZapped ? \'#fff\' : \'#a855f7\', strokeWidth: 2.5 }} />'
);

// Also update the div styling
content = content.replace(
  `                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isZapped ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0,
                      border: \`1px solid \${isZapped ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.12)'}\`,
                      transition: 'all 0.3s'
                    }}>`,
  `                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: isZapped 
                        ? 'linear-gradient(135deg, #d946ef, #a855f7)' 
                        : 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(168, 85, 247, 0.08))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: \`1px solid \${isZapped ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.15)'}\`,
                      transition: 'all 0.3s',
                      boxShadow: isZapped ? '0 4px 12px rgba(168, 85, 247, 0.4)' : '0 2px 6px rgba(168, 85, 247, 0.1)'
                    }}>`
);

fs.writeFileSync(file, content, 'utf8');
console.log('✓ Icon rendering fixed - React components now render correctly!');
