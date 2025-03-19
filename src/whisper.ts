import * as crypto from './whisper-crypto'
import { JWKWithKeyHint, JWKPair } from './whisper-crypto'
import * as dropzone from './whisper-dropzone'
import Alpine, { ElementWithXAttributes } from 'alpinejs'
import { JWK, GeneralJWE } from 'jose'

// Call default module exports, provide listeners
crypto.default(keysAvailable)
dropzone.default([whisperFilesAdded], [recipientKeysAdded])

// Screens selectable per menu
export enum Screen {
    Send,
    Receive,
    Account,
    Info
}
// State of the crypto modules and key availability
export enum CryptoEngineState {
    // Engine has not been initialized and maybe never will if brwoser doesn't support it
    Unkwown,
    // Engine is intialized and can be used
    Initialized,
    // Engine is being used
    Busy,
    // encryption / decryption has finished
    CryptComplete
}
// Add to window to be usable from inline JS in Alpine
// https://alpinejs.dev/essentials/installation#as-a-module
window.Alpine = Alpine;
window.Screen = Screen;
window.CryptoEngineState = CryptoEngineState;

// Alpine configuration, create a store for Alpine to react on
const whisperStateStoreName = "whisperState" // TODO: Is a single store sufficient and good practice?
type EncryptedFile = {
    name: string;
    jwe: GeneralJWE;
}
// type of local "session" object
type Store = {
    activeScreen: Screen;
    engineState: CryptoEngineState;
    personalPublicKey: JWKWithKeyHint | null;
    personalPrivateKey: JWK | null;
    recipientPublicKeys: Array<JWKWithKeyHint>;
    files: Array<File>;
    encryptedFiles: Array<EncryptedFile>;
    personalKeyHint: string;
};
// instance of local "session" containing all info to be dynamically updated by alpine
const store: Store = {
    activeScreen: Screen.Send,
    engineState: CryptoEngineState.Unkwown,
    personalPublicKey: null,
    personalPrivateKey: null,
    recipientPublicKeys: [],
    files: [],
    encryptedFiles: [],
    personalKeyHint: ''
}
// Register store with alpine
Alpine.store(whisperStateStoreName, store);
// Link some callbacks to alpine context
// Alpine.magic('copyPersonalPublicKeysToClipboard', copyPersonalPublicKeysToClipboard);
Alpine.magic('reset', reset);
Alpine.magic('submitPersonalKeyHint', submitPersonalKeyHint);
Alpine.magic('executeEncryption', executeEncryption);
// Start the show
Alpine.start();

// Update store when keys become accessible
function keysAvailable(personalKeyPair: JWKPair) {
    const store = (Alpine.store(whisperStateStoreName) as Store)
    store.personalPublicKey = personalKeyPair.publicJWK;
    store.personalPrivateKey = personalKeyPair.privateJWK;
    // Enable all components dependent on crypto engine
    store.engineState = CryptoEngineState.Initialized;
}
// Reset states in order to start over
function reset() {
    const store = (Alpine.store(whisperStateStoreName) as Store)
    store.recipientPublicKeys.length = 0;
    store.files.length = 0;
    store.encryptedFiles.length = 0;
    store.personalKeyHint = '';
    store.engineState = CryptoEngineState.Initialized;
}

function submitPersonalKeyHint() {
    // Set the hint via Alpine, to make the UI react to the update
    const alpineStore = (Alpine.store(whisperStateStoreName) as Store)
    if (alpineStore.personalPublicKey) {
        // Set custom hint and save updated reference
        alpineStore.personalPublicKey.xKidHint = alpineStore.personalKeyHint
    }
    // But store the "raw" keys and not the alpine proxy to IndexedDB
    if (store.personalPublicKey && store.personalPrivateKey) {
        crypto.storePersonalKeyPair({ privateJWK: store.personalPrivateKey, publicJWK: store.personalPublicKey })
    }
}

function whisperFilesAdded(files: Array<File>) {
    const store = (Alpine.store(whisperStateStoreName) as Store)
    store.files.push(...files);
}

async function recipientKeysAdded(files: Array<File>) {
    files.forEach(async f => {
        f.text().then(crypto.validateAndParseJWKString).then(jwk => {
            console.log("A new recipient seems to be available!")
            const store = (Alpine.store(whisperStateStoreName) as Store)
            store.recipientPublicKeys.push(jwk);

        }).catch(ex => console.warn("Failed to accept recipient jwk!", ex));
    }
    );
}

function executeEncryption() {
    (Alpine.store(whisperStateStoreName) as Store).engineState = CryptoEngineState.Busy
    crypto.encryptFilesForMultipleRecipients(store.files, store.recipientPublicKeys, encryptionComplete)
}

function encryptionComplete(filename: string, jwe: GeneralJWE) {
    (Alpine.store(whisperStateStoreName) as Store).encryptedFiles.push({ name: filename, jwe: jwe });
}