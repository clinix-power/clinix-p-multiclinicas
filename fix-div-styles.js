const fs = require('fs');

const file = 'c:/Clinix Power Multi/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the old div with gradient version
const oldDiv = `                    <div style={{
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
                    }}>`;

const newDiv = `                    <div style={{
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
                    }}>`;

content = content.replace(oldDiv, newDiv);

fs.writeFileSync(file, content, 'utf8');
console.log('✓ Div styles updated with gradients!');
