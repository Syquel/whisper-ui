export default function (whisperListeners?: Array<FilesDroppedListener>, recipientListeners?: Array<FilesDroppedListener>) {
    if (whisperListeners) {
        whisperFilesDroppedListeners.push(...whisperListeners);
    }
    if (recipientListeners) {
        recipientKeyFilesDroppedListeners.push(...recipientListeners);
    }
    initWhisperDropZone();
    initRecipientDropZone();
} // makes this a module

const clickEvent: string = "click";
const dragoverEvent: string = "dragover";
const dragleaveEvent: string = "dragleave";
const dragendEvent: string = "dragend";
const changeEvent: string = "change";
const classOver = "dropzone-over"
type FilesDroppedListener = (files: Array<File>) => void;

/** ========= internal, non exported stuff ========= */

const whisperFilesDroppedListeners: Array<FilesDroppedListener> = [];
const recipientKeyFilesDroppedListeners: Array<FilesDroppedListener> = [];

async function notifyFilesAvailable(listsners: Array<FilesDroppedListener>, files: Array<File>) {
    listsners.forEach(l => l(files));
}

function initWhisperDropZone() {
    const dropZoneElement = document.getElementById("whisper-dropzone") as HTMLElement;
    const dropZoneInputElement = document.getElementById("whisper-dropzone-input") as HTMLInputElement;
    initDropZone(dropZoneElement, dropZoneInputElement, whisperFilesDroppedListeners);
}

function initRecipientDropZone() {
    const dropZoneElement = document.getElementById("add-recipient-dropzone") as HTMLElement;
    const dropZoneInputElement = document.getElementById("add-recipient-dropzone-input") as HTMLInputElement;
    initDropZone(dropZoneElement, dropZoneInputElement, recipientKeyFilesDroppedListeners);
}

function initDropZone(dropZoneElement: HTMLElement, dropZoneInputElement: HTMLInputElement, listeners: Array<FilesDroppedListener>) {
    // Open file dialog on click
    dropZoneElement.addEventListener(clickEvent, e => dropZoneInputElement.click())
    dropZoneElement.addEventListener(dragoverEvent, e => {
        e.preventDefault();
        dropZoneElement.classList.add(classOver);
    });
    [dragleaveEvent, dragendEvent].forEach(type => dropZoneElement.addEventListener(type, e => dropZoneElement.classList.remove(classOver)))

    dropZoneElement.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();

        if (e.dataTransfer?.files.length) {
            const files: FileList = e.dataTransfer.files;
            console.log("Received %d files on %s.", files.length, e.target)
            listeners.forEach(l => l(Array.from(files)))
        }
        dropZoneElement.classList.remove(classOver);
    });

    dropZoneInputElement.addEventListener(changeEvent, (e: Event) => {
        if (dropZoneInputElement.files?.length) {
            const files = dropZoneInputElement.files;
            console.log("Received %d files on %s.", dropZoneInputElement.files?.length, e.target)
            listeners.forEach(l => l(Array.from(files)))
        }
    });
}
