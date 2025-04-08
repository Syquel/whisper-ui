// global declarations
export { };

declare global {
    // redeclare Window to makle some types available
    interface Window {
        Alpine: Alpine;
        WhisperScreen: WhisperScreen;
        CryptoEngineState: CryptoEngineState;
        FileSuffix: FileSuffix;
    }
}