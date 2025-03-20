export default function (sendWhisperFilesListeners: Array<FilesDroppedListener>, recipientFilesListeners: Array<FilesDroppedListener>, receivedWhisperFilesListeners: Array<FilesDroppedListener>) {
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
type FilesDroppedListener = (files: Array<File>) => void;

/** ========= internal, non exported stuff ========= */
function initSendWhisperFilesDropZone(listeners: Array<FilesDroppedListener>) {
    const dropZoneElement = document.getElementById("whisper-dropzone") as HTMLElement;
    const dropZoneInputElement = document.getElementById("whisper-dropzone-input") as HTMLInputElement;
    initDropZone(dropZoneElement, dropZoneInputElement, listeners);
}

function initRecipientDropZone(listeners: Array<FilesDroppedListener>) {
    const dropZoneElement = document.getElementById("add-recipient-dropzone") as HTMLElement;
    const dropZoneInputElement = document.getElementById("add-recipient-dropzone-input") as HTMLInputElement;
    initDropZone(dropZoneElement, dropZoneInputElement, listeners);
}

function initReceivedWhisperFilesDropZone(listeners: Array<FilesDroppedListener>) {
    const dropZoneElement = document.getElementById("whisper-received-dropzone") as HTMLElement;
    const dropZoneInputElement = document.getElementById("whisper-received-dropzone-input") as HTMLInputElement;
    initDropZone(dropZoneElement, dropZoneInputElement, listeners);
}

function initDropZone(dropZoneElement: HTMLElement, dropZoneInputElement: HTMLInputElement, listeners: Array<FilesDroppedListener>) {
    // Open file dialog on click
    dropZoneElement.addEventListener(Event.Click, e => dropZoneInputElement.click())
    dropZoneElement.addEventListener(Event.DragOver, e => {
        e.preventDefault();
        dropZoneElement.classList.add(classOver);
    });
    [Event.DragLeave, Event.DragEnd].forEach(type => dropZoneElement.addEventListener(type, e => dropZoneElement.classList.remove(classOver)))

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
