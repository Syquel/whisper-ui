import * as jose from 'jose'

/** A pair consisting of a private an a public key. */
export interface KeyPair {
    privateKey: CryptoKey
    publicKey: JWKWithKeyHint
}
export interface JWKWithKeyHint extends jose.JWK {
    /** Custom extension to add a hint (like name or email) */
    xKidHint?: string;
}

// See https://github.com/panva/jose/issues/210
// TODO: Not supported by every browser, try to generate the most secure one suitable for encryption
const curveAlg = "ECDH-ES";
const jweEnc = "A256GCM";
const jweAlg = "ECDH-ES+A256KW";
const dbSchemaVersion = 2;
const keyDatabaseName = "JWKDatabase";
const keyPairsObjectStoreName = 'keys';
enum DBModes {
    R = 'readonly',
    RW = 'readwrite'
}
type KeysAvailableListener = (personalKeyPair: KeyPair) => void;


export function start(listeners: KeysAvailableListener[]) {
    // Check for IndexedDB support
    // TODO: Consider using https://modernizr.com/ for IndexedDB and WebCryptoAPI checks
    if (!window.indexedDB) {
        console.log("Your browser doesn't support IndexedDB.");
    } else if (listeners?.length > 0) {
        fetchOrGeneratePersonalKeyPair(listeners);
    } else {
        console.warn("No listeners provided, skipping key retrieval.")
    }
}

export async function deleteAndRegenerateKeys(listeners: KeysAvailableListener[]) {
    const request = indexedDB.open(keyDatabaseName, dbSchemaVersion);
    request.onsuccess = e => {
        (e.target as IDBOpenDBRequest).result
            .transaction([keyPairsObjectStoreName], DBModes.RW)
            .objectStore(keyPairsObjectStoreName)
            .clear();
        console.log("%s deleted from IndexedDB as requested by user", keyPairsObjectStoreName);
        start(listeners);
    }
}

export async function validateAndParseJWKFile(jwkFile: File): Promise<JWKWithKeyHint> {
    // Parse the JWK string into a JSON object
    return jwkFile.text()
        .then(t => JSON.parse(t) as JWKWithKeyHint)
        .then(async jwkWithHint => ({ jwkWithHint: jwkWithHint, imported: await jose.importJWK(jwkWithHint) }))
        .then(({ jwkWithHint, imported }) => {
            //TODO Better checks - we expect for instance a kid and our custom xKidHint but never a private d claim
            if (imported instanceof CryptoKey
                && imported.algorithm
                && jwkWithHint.kid
                && jwkWithHint.xKidHint
                && jwkWithHint.alg
                && jwkWithHint.x
                && jwkWithHint.y
                && !jwkWithHint.d) {
                return jwkWithHint;
            }
            throw "Supplied text does not look like a valid whisper JWK!";
        });
}

export async function validateAndParseJWEFile(jweFile: File, jwk: jose.JWK): Promise<jose.GeneralJWE> {
    const kid = jwk.kid;
    return jweFile.text()
        .then(t => JSON.parse(t) as jose.GeneralJWE)
        .then(jwe => {
            if (jwe.recipients.filter(r => kid == r.header?.kid).length > 0) {
                // Yes! We found a recepient matching our personal kid 
                console.log("Found matching kid %s in JWE file %s.", kid, jweFile.name)
                return jwe;
            }
            throw "Could not find recipient for kid " + kid + " in JWE."
        });
}

/** Updates the changed key pair previously changed by reference (we might want to change this someday) */
export function storePersonalKeyPair(personalKeyPair: KeyPair, ...listeners: KeysAvailableListener[]) {
    const request = indexedDB.open(keyDatabaseName, dbSchemaVersion);
    request.onsuccess = e => {
        const db = (e.target as IDBOpenDBRequest).result;
        storeKeyPairlocally(personalKeyPair, db)
            .then(kp => listeners?.forEach(l => l(kp)))
            .catch(e => console.warn("Failed to store updated keypair for kid %s", personalKeyPair.publicKey.kid, e))
    }
}

export async function encryptFileForMultipleRecipients(file: File, recipients: jose.JWK[]): Promise<jose.GeneralJWE> {
    //TODO: Memory consumption, streaming of content, is text encoding the right way?int8Array
    return file.arrayBuffer()
        // Initialize GeneralEncrypt with file contents
        .then(b => new Uint8Array(b))
        .then(b => new jose.GeneralEncrypt(b))
        // Set JWE encoding and algorithm in protected header
        .then(e => e.setProtectedHeader({ enc: jweEnc, alg: jweAlg }))
        // For each recipient, encrypt the CEK using their public key
        .then(e => recipients.map(jwk => addRecipient(jwk, e)))
        // Collect all promisied for the recipients
        .then(p => Promise.all(p))
        // Call the shorthand method to encrpyt the JWE on any one recipient
        .then(r => r[0].encrypt())
        ;
}

export async function decryptFile(jwe: jose.GeneralJWE, personalPrivateKey: CryptoKey): Promise<Uint8Array> {
    return jose.generalDecrypt(jwe, personalPrivateKey)
        .then(res => res.plaintext)
        ;
}

/** ========= internal, non exported stuff ========= */
function fetchOrGeneratePersonalKeyPair(listeners: KeysAvailableListener[]) {
    // Open (or create) the database
    const request = indexedDB.open(keyDatabaseName, dbSchemaVersion);
    // Create the schema (on new db or upgraded schema)
    request.onupgradeneeded = onDBUpgradeNeeded;
    request.onsuccess = e => onDBSuccessfullyOpened(e, listeners);
}

function onDBUpgradeNeeded(event: IDBVersionChangeEvent) {
    const db = (event.target as IDBOpenDBRequest).result;
    if (db.objectStoreNames.contains(keyPairsObjectStoreName)) {
        console.warn("An old Whisper! keypair has been found and has unfortunately to be deleted as it cannot be upgraded for security reasons :/")
        db.deleteObjectStore(keyPairsObjectStoreName);
        console.log("Old IndexDB version dropped and can be recreated with schema version %s!", dbSchemaVersion);
    }
    // (Re) Create an object store
    const objectStore = db.createObjectStore(keyPairsObjectStoreName);
    console.log("IndexDB created %s with schema version %s!", objectStore.name, dbSchemaVersion);
}

function onDBSuccessfullyOpened(event: Event, listeners: KeysAvailableListener[]) {
    const db = (event.target as IDBOpenDBRequest).result;

    // Retrieve the keys
    const transaction = db.transaction([keyPairsObjectStoreName], DBModes.R);
    const objectStore = transaction.objectStore(keyPairsObjectStoreName);
    const getRequest = objectStore.get(0); // For now we only support a single pair

    getRequest.onsuccess = function (event: Event) {
        const data = (event.target as IDBRequest).result;
        if (data) {
            const keyPair: KeyPair = data;
            console.log('Retrieved JWK:', keyPair);
            listeners.forEach(l => l(keyPair));
        } else {
            console.log('No JWK found in IndexedDB.');
            generateNewPair()
                .then(kp => storeKeyPairlocally(kp, db))
                .then(kp => listeners.forEach(l => l(kp)))
                .catch(e => console.warn("Failed to create personal key pair!", e));
        }
    };
}

/** Stores a key pair */
async function storeKeyPairlocally(keyPair: KeyPair, targetDatabase: IDBDatabase): Promise<KeyPair> {
    const transaction = targetDatabase.transaction([keyPairsObjectStoreName], DBModes.RW);
    const objectStore = transaction.objectStore(keyPairsObjectStoreName);
    objectStore.put(keyPair, 0); // For now we only support a single pair
    console.log("Successfully persisted keypair with label %s and kid %s", keyPair.publicKey.xKidHint, keyPair.publicKey.kid)
    return keyPair;
}

/** Generates a new key pair */
async function generateNewPair(): Promise<KeyPair> {
    return jose.generateKeyPair(curveAlg, { extractable: false })
        .then(toWhisperKeyPair)
        .catch(error => {
            console.error('Error generating key pair:', error);
            throw error;
        });
}

async function toWhisperKeyPair(keypairResult: jose.GenerateKeyPairResult): Promise<KeyPair> {
    return jose.exportJWK(keypairResult.publicKey)
        // Manually add alg, as it is not done by default!
        .then(addAlgorithm)
        .then(addFingerprint)
        .then(jwk => ({ privateKey: keypairResult.privateKey, publicKey: jwk } as KeyPair))
}

function addAlgorithm(jwk: jose.JWK): jose.JWK {
    jwk.alg = curveAlg;
    return jwk;
}

async function addRecipient(jwk: jose.JWK, encryptor: jose.GeneralEncrypt): Promise<jose.Recipient> {
    // Use ECDH-ES+A256KW for key wrapping, will generate an epk (ephemeral public key) and cek (Content Encryption Key)
    return jose.importJWK(jwk, jweAlg)
        .then(pk => encryptor.addRecipient(pk))
        // Add the kid to recipient header in JWE in order to select key when decrypting
        .then(r => r.setUnprotectedHeader({ kid: jwk.kid }));
}

async function addFingerprint(jwk: jose.JWK): Promise<jose.JWK> {
    return fingerprint(jwk)
        .then(fp => { jwk.kid = fp; return jwk });
}

async function fingerprint(jwk: jose.JWK): Promise<string> {
    if (jwk.x && jwk.y) {
        return hashWithSHA256(jwk.x + jwk.y);
    }
    throw "JWK must contain x and y coordinates!"
}

async function hashWithSHA256(input: string): Promise<string> {
    const data = new TextEncoder().encode(input); // Encode the input string to bytes
    const hashBuffer = await crypto.subtle.digest("SHA-256", data); // Generate the hash
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join(""); // Convert bytes to hex
    return hashHex;
}
