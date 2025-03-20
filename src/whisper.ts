import * as crypto from './whisper-crypto'
import { JWKWithKeyHint, JWKPair } from './whisper-crypto'
import * as dropzone from './whisper-dropzone'
import Alpine from 'alpinejs'
import { JWK, GeneralJWE } from 'jose'

// Call default module exports, provide listeners
crypto.default(keysAvailable)
dropzone.default([whisperFilesAdded], [recipientKeysAdded], [receivedWhisperFilesAdded])

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
    Initialized
}
/* File name suffixes to distinguish from original */
enum FileSuffix {
    PersonalPublicKey = "-whisper.public.json",
    EncryptedFile = "-whisper.encrypted.json"
}
// Add to window to be usable from inline JS in Alpine
// https://alpinejs.dev/essentials/installation#as-a-module
window.Alpine = Alpine;
window.Screen = Screen;
window.CryptoEngineState = CryptoEngineState;
window.FileSuffix = FileSuffix;

// Alpine configuration, create a store for Alpine to react on
const whisperStateStoreName = "whisperState" // TODO: Is a single store sufficient and good practice?
type EncryptedFile = {
    name: string;
    jwe: GeneralJWE;
}
type DecryptedFile = {
    name: string;
    data: string; // base64
}
type SendScreen = {
    recipientPublicKeys: Array<JWKWithKeyHint>;
    filesToEncrypt: Array<File>;
    encryptedFiles: Array<EncryptedFile>;
}
type ReceivedScreen = {
    encryptedFiles: Array<EncryptedFile>;
    decryptedFiles: Array<DecryptedFile>;
}
// type of local "session" object
type Store = {
    activeScreen: Screen;
    engineState: CryptoEngineState;
    personalPublicKey: JWKWithKeyHint | null;
    personalPrivateKey: JWK | null;
    personalKeyHint: string;
    sendScreen: SendScreen;
    receivedScreen: ReceivedScreen;
    shortenTo11(input: string): string;
};
// instance of local "session" containing all info to be dynamically updated by alpine
const store: Store = {
    activeScreen: Screen.Send,
    engineState: CryptoEngineState.Unkwown,
    personalPublicKey: null,
    personalPrivateKey: null,
    personalKeyHint: '',
    sendScreen: {
        recipientPublicKeys: [],
        filesToEncrypt: [],
        encryptedFiles: [],
    },
    receivedScreen: {
        encryptedFiles: [],
        decryptedFiles: []
    },
    shortenTo11: shortenTo11
}
// Register store with alpine
Alpine.store(whisperStateStoreName, store);
// Link some callbacks to alpine context
Alpine.magic('reset', reset);
Alpine.magic('submitPersonalKeyHint', submitPersonalKeyHint);
Alpine.magic('executeEncryption', executeEncryption);
Alpine.magic('executeDecryption', executeDecryption);
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
    store.personalKeyHint = '';

    // Reset send screen
    store.sendScreen.recipientPublicKeys.length = 0;
    store.sendScreen.filesToEncrypt.length = 0;
    store.sendScreen.encryptedFiles.length = 0;

    // Reset Received Screen
    store.receivedScreen.encryptedFiles.length = 0;
    store.receivedScreen.decryptedFiles.length = 0;

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
    store.sendScreen.filesToEncrypt.push(...files);
}

async function recipientKeysAdded(files: Array<File>) {
    files.forEach(f => {
        crypto.validateAndParseJWKFile(f)
            .then(jwk => {
                console.log("A new recipient seems to be available!")
                const store = (Alpine.store(whisperStateStoreName) as Store)
                store.sendScreen.recipientPublicKeys.push(jwk);
            })
            .catch(ex => console.warn("Failed to accept recipient jwk!", ex));
    });
}

function executeEncryption() {
    const store = (Alpine.store(whisperStateStoreName) as Store)
    const keys = store.sendScreen.recipientPublicKeys;
    store.sendScreen.filesToEncrypt.forEach(f => {
        crypto.encryptFileForMultipleRecipients(f, keys)
            .then(jwe => ({ name: f.name, jwe: jwe }))
            .then(ef => store.sendScreen.encryptedFiles.push(ef))
            .catch(e => console.warn("Failed to encrypt %s.", f.name, e))
    })
}

async function receivedWhisperFilesAdded(files: Array<File>) {
    const store = (Alpine.store(whisperStateStoreName) as Store)
    if (store.personalPublicKey) {
        const jwk: JWK = store.personalPublicKey;
        files.forEach(f => {
            crypto.validateAndParseJWEFile(f, jwk)
                .then(j => ({ name: f.name, jwe: j }))
                .then(ef => store.receivedScreen.encryptedFiles.push(ef))
                .catch(e => console.warn("File %s is no valid JWE containing a recipient with kid %s", f.name, jwk.kid, e))
        })
    }
}

function executeDecryption() {
    const store = (Alpine.store(whisperStateStoreName) as Store)
    if (store.personalPrivateKey) {
        const jwk: JWK = store.personalPrivateKey;
        store.receivedScreen.encryptedFiles.forEach(f => {
            crypto.decryptFile(f.jwe, jwk)
                .then(d => ({ name: tryExtractFileName(f.name), data: base64(d) } as DecryptedFile))
                .then(r => store.receivedScreen.decryptedFiles.push(r))
                .then(() => console.log("Successully decypted %s with kid %s.", f.name, jwk.kid))
                .catch(e => console.warn("Failed to decrypt %s", f.name, e))
        })
    }
}

function tryExtractFileName(fileName: string): string {
    return fileName.replace(FileSuffix.EncryptedFile, "");
}

/** Take the first 8 chars of input and appen '...' doing nothing when input length is 11 chars or less */
function shortenTo11(input: string): string {
    return input.length > 11 ? input.slice(0, 8) + "..." : input;
}

function base64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data));
}
