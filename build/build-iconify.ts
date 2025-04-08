// Build script that outputs css containing the icons used in this application
// See https://iconify.design/docs/usage/css/utils/
import { readFileSync, writeFileSync } from "fs";
import { getIconsCSS } from '@iconify/utils';
import { locate } from '@iconify/json';
import { IconifyJSON } from '@iconify/types';

const iconSetName: string = 'mdi';
const targetFileName = 'src/css/' + iconSetName + '-icons.css'
const chosenIcons: Array<string> = [
    'account-circle-outline',
    'call-made',
    'call-received',
    'check-circle-outline',
    'check',
    'close',
    'github',
    'help-circle-outline',
    'human-greeting',
    'information-outline',
    'key-chain',
    'lock-check-outline',
    'lock-open-check-outline',
    'robot-dead',
    'security',
    'tray-arrow-down',
];

// Parse each icon set
let allIconCss = '';
// Find location of .json file
const filename = locate(iconSetName);

// Load file and parse it
const iconSetJson: IconifyJSON = JSON.parse(readFileSync(filename, 'utf8'));

// Get CSS
const iconCss: string = getIconsCSS(iconSetJson, chosenIcons);

// Add it to code
allIconCss += iconCss;

// Save CSS file
writeFileSync(targetFileName, allIconCss, 'utf8');
console.log('Saved CSS, %d icons and %d bytes)', chosenIcons.length, allIconCss.length);