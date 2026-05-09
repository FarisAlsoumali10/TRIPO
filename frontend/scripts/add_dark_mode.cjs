const fs = require('fs');
const path = require('path');

const filesToProcess = [
  "WalletScreen.tsx",
  "NotificationsScreen.tsx",
  "MyBookingsScreen.tsx",
  "SettingsScreen.tsx",
  "RentalsScreen.tsx",
  "AIPlannerScreen.tsx",
  "YourMoodScreen.tsx",
  "CommunitiesScreen.tsx",
  "CreateTourScreen.tsx",
  "PersonalListsScreen.tsx",
  "ToursScreen.tsx",
  "DiscoverScreen.tsx",
  "ExploreScreen.tsx",
  "HomeScreen.tsx"
];

const mapping = {
  'bg-white': 'dark:bg-navy-900',
  'bg-slate-50': 'dark:bg-navy-950',
  'bg-slate-100': 'dark:bg-navy-800',
  'bg-slate-200': 'dark:bg-white/10',
  'text-slate-900': 'dark:text-white',
  'text-slate-800': 'dark:text-slate-100',
  'text-slate-700': 'dark:text-slate-300',
  'text-slate-600': 'dark:text-slate-400',
  'text-slate-500': 'dark:text-slate-500',
  'border-slate-200': 'dark:border-white/10',
  'border-slate-100': 'dark:border-white/8',
  'shadow-sm': 'dark:shadow-black/30',
  
  // Gray variants as they are synonymous in default tailwind or requested
  'bg-gray-50': 'dark:bg-navy-950',
  'bg-gray-100': 'dark:bg-navy-800',
  'bg-gray-200': 'dark:bg-white/10',
  'text-gray-900': 'dark:text-white',
  'text-gray-800': 'dark:text-slate-100',
  'text-gray-700': 'dark:text-slate-300',
  'text-gray-600': 'dark:text-slate-400',
  'text-gray-500': 'dark:text-slate-500',
  'border-gray-200': 'dark:border-white/10',
  'border-gray-100': 'dark:border-white/8'
};

filesToProcess.forEach(fileName => {
  const filePath = path.join(__dirname, '../src/screens', fileName);
  if (!fs.existsSync(filePath)) {
    console.log('Skipping ' + fileName + ' (not found)');
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // We find all instances of className="..." or className={`...`} and replace inside them
  const classNamesRegex = /className=(?:["']([^"']+)["']|\{`([^`]+)`\})/g;
  
  content = content.replace(classNamesRegex, (match, p1, p2) => {
    let innerClasses = p1 || p2;
    if (!innerClasses) return match;
    
    let originalInnerClasses = innerClasses;
    let classList = innerClasses.split(/\s+/);
    let newClassList = [...classList];

    for (let i = 0; i < classList.length; i++) {
      let cls = classList[i];
      if (mapping[cls]) {
        let darkVariant = mapping[cls];
        // Only add if this specific dark variant isn't already somewhere in the list
        if (!classList.includes(darkVariant) && !newClassList.includes(darkVariant)) {
          // Insert right after the current class
          let indexInNewList = newClassList.indexOf(cls);
          newClassList.splice(indexInNewList + 1, 0, darkVariant);
        }
      }
    }

    if (p1) {
      return `className="${newClassList.join(' ')}"`;
    } else {
      return `className={\`${newClassList.join(' ')}\`}`;
    }
  });

  // Also replace loosely placed classes (e.g. string concatenations)
  // This is a fallback for strings not directly matched by className regex above
  for (const [lightCls, darkCls] of Object.entries(mapping)) {
      const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const lightClsEscaped = escapeRegExp(lightCls);
      const darkClsEscaped = escapeRegExp(darkCls);
      
      const regex = new RegExp(`(?<!dark:)\\b${lightClsEscaped}\\b(?!\\s+${darkClsEscaped})`, 'g');
      content = content.replace(regex, (match) => {
          // Verify we aren't in a spot where it already exists nearby (hacky fallback)
          return `${lightCls} ${darkCls}`;
      });
  }

  // Remove duplicates that might have been introduced by the fallback
  // (e.g. `dark:bg-navy-900 dark:bg-navy-900`)
  for (const darkCls of Object.values(mapping)) {
      const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const darkClsEscaped = escapeRegExp(darkCls);
      const dupRegex = new RegExp(`\\b${darkClsEscaped}\\s+${darkClsEscaped}\\b`, 'g');
      content = content.replace(dupRegex, darkCls);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${fileName}`);
  } else {
    console.log(`➖ No changes needed for ${fileName}`);
  }
});

console.log('\n🎉 Dark mode tokens successfully applied!');
