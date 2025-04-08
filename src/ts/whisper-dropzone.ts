export default function (sendWhisperFilesListeners: FilesDroppedListener[], recipientFilesListeners: FilesDroppedListener[], receivedWhisperFilesListeners: FilesDroppedListener[]) {
    initSendWhisperFilesDropZone(sendWhisperFilesListeners);
    initRecipientDropZone(recipientFilesListeners);
    initReceivedWhisperFilesDropZone(receivedWhisperFilesListeners)
} // makes this a module

enum Event {
    Click = "click",
    DragOver = "dragover",
    DragLeave = "dragleave",
    DragEnd = "dragend",
    Drop = "drop",
    Change = "change",
}
const classOver = "dropzone-over"
type FilesDroppedListener = (files: File[]) => void;

/** ========= internal, non exported stuff ========= */
function initSendWhisperFilesDropZone(listeners: FilesDroppedListener[]) {
    const dropZoneElement = document.getElementById("whisper-dropzone") as HTMLElement;
    const dropZoneInputElement = document.getElementById("whisper-dropzone-input") as HTMLInputElement;
    initDropZone(dropZoneElement, dropZoneInputElement, listeners);
}

function initRecipientDropZone(listeners: FilesDroppedListener[]) {
    const dropZoneElement = document.getElementById("add-recipient-dropzone") as HTMLElement;
    const dropZoneInputElement = document.getElementById("add-recipient-dropzone-input") as HTMLInputElement;
    initDropZone(dropZoneElement, dropZoneInputElement, listeners);
}

function initReceivedWhisperFilesDropZone(listeners: FilesDroppedListener[]) {
    const dropZoneElement = document.getElementById("whisper-received-dropzone") as HTMLElement;
    const dropZoneInputElement = document.getElementById("whisper-received-dropzone-input") as HTMLInputElement;
    initDropZone(dropZoneElement, dropZoneInputElement, listeners);
}

function initDropZone(dropZoneElement: HTMLElement, dropZoneInputElement: HTMLInputElement, listeners: FilesDroppedListener[]) {
    // Open file dialog on click
    dropZoneElement.addEventListener(Event.Click, () => dropZoneInputElement.click())
    dropZoneElement.addEventListener(Event.DragOver, e => {
        e.preventDefault();
        dropZoneElement.classList.add(classOver);
    });
    [Event.DragLeave, Event.DragEnd].forEach(type => dropZoneElement.addEventListener(type, () => dropZoneElement.classList.remove(classOver)))

    dropZoneElement.addEventListener(Event.Drop, (e: DragEvent) => {
        e.preventDefault();

        if (e.dataTransfer?.files.length) {
            const files: FileList = e.dataTransfer.files;
            console.log("Received %d files on %s.", files.length, e.target)
            listeners.forEach(l => l(Array.from(files)))
        }
        dropZoneElement.classList.remove(classOver);
    });

    dropZoneInputElement.addEventListener(Event.Change, e => {
        if (dropZoneInputElement.files?.length) {
            const files = dropZoneInputElement.files;
            console.log("Received %d files on %s.", dropZoneInputElement.files?.length, e.target)
            listeners.forEach(l => l(Array.from(files)))
        }
    });
}
