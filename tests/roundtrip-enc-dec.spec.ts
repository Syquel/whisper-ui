import { test, expect } from "@playwright/test";
import { Readable } from "stream";

const publicKeyLabel = "__Playwright";

// a complete roundtrip test with encryption and decryption
test("test encrypt decrypt roundtrip", async ({ page }, testInfo) => {
    await page.goto("/");

    // Fill in key label
    await expect(page.getByRole("textbox", { name: "Hint about your identity" })).toBeVisible();
    await page.getByRole("textbox", { name: "Hint about your identity" }).click();
    await page.getByRole("textbox", { name: "Hint about your identity" }).pressSequentially(publicKeyLabel);

    // Check and click OK button
    await expect(page.getByRole("button", { name: "Ok" })).toBeVisible();
    await page.getByRole("button", { name: "Ok" }).click();

    // Check and click download button
    await expect(page.getByRole("link", { name: publicKeyLabel })).toBeVisible();
    const publicKeyDownloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: publicKeyLabel }).click();
    const publicKeyDownload = await publicKeyDownloadPromise;
    const publicKeyDownloadPath = await publicKeyDownload.path();
    console.log("Saved public key %s as %s.", publicKeyDownload.suggestedFilename(), publicKeyDownloadPath);
    // Screenshot - looks nice in report
    await page.screenshot().then(sc => testInfo.attach("Public key download", { body: sc, contentType: "image/png" }));

    // Goto Send page
    await page.getByRole("list").getByRole("link", { name: "Send" }).click();
    // Upload own public key as recipient
    await expect(page.getByText("Drag & Drop your recipient")).toBeVisible();
    await page.locator("id=add-recipient-dropzone").locator("id=add-recipient-dropzone-input").setInputFiles(publicKeyDownloadPath);
    // Check label
    await expect(page.getByText(publicKeyLabel).nth(0)).toBeVisible();

    // Upload file to be encrypted
    await expect(page.locator("id=whisper-dropzone").getByText("Drag & Drop your file(s) to")).toBeVisible();
    await page.locator("id=whisper-dropzone").locator("id=whisper-dropzone-input").setInputFiles(publicKeyDownloadPath);

    // Perform encryption
    await expect(page.getByText("Ready? Your data will be encrypted locally on your device and can only be")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go!" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reset" })).toBeVisible();
    await page.getByRole("link", { name: "Go!" }).click();

    // Download the encrypted file
    const cryptogramDownloadLinkName = toAbbreviatedFileName(publicKeyDownloadPath);
    await expect(page.getByRole("heading", { name: "Complete!" })).toBeVisible();
    await expect(page.getByRole("link", { name: cryptogramDownloadLinkName })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear" })).toBeVisible();
    // Label from recipients should be hidden (1) but visible in dowload section (0)
    await expect(page.getByRole("listitem").filter({ hasText: publicKeyLabel }).nth(0)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: publicKeyLabel }).nth(1)).toBeHidden();

    const cryptogramDownloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: cryptogramDownloadLinkName }).click();
    const cryptogramDownload = await cryptogramDownloadPromise;
    const cryptogramDownloadPath = await cryptogramDownload.path();
    console.log("Saved cryptogram %s as %s.", cryptogramDownload.suggestedFilename(), cryptogramDownloadPath);
    // Screenshot - looks nice in report
    await page.screenshot().then(sc => testInfo.attach("Encryption complete", { body: sc, contentType: "image/png" }));

    // Goto Receive page
    await page.getByRole("list").getByRole("link", { name: "Receive" }).click();
    await expect(page.getByRole("heading", { name: "What have you received?" })).toBeVisible();

    // Upload encrypted file
    await expect(page.locator("id=whisper-received-dropzone").getByText("Drag & Drop your file(s) to")).toBeVisible();
    await page.locator("id=whisper-received-dropzone").locator("id=whisper-received-dropzone-input").setInputFiles(cryptogramDownloadPath);

    // Perform descryption
    await expect(page.getByRole("heading", { name: "Ready?" })).toBeVisible();
    await expect(page.getByText("Ready? Your data will be decrypted locally on your device and is never")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go!" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reset" })).toBeVisible();
    await page.getByRole("link", { name: "Go!" }).click();
    await expect(page.getByRole("heading", { name: "Complete!" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear" })).toBeVisible();

    const decryptedDownloadLinkName = toAbbreviatedFileName(cryptogramDownloadPath);
    const decryptedDownloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: decryptedDownloadLinkName }).click();
    const decryptedDownload = await decryptedDownloadPromise;
    const decryptedDownloadPath = await decryptedDownload.path();
    console.log("Saved decrypted file %s as %s.", decryptedDownload.suggestedFilename(), decryptedDownloadPath);

    // Screenshot - looks nice in report
    await page.screenshot().then(sc => testInfo.attach("Decryption complete", { body: sc, contentType: "image/png" }));

    // Since we used the keyfile as content, we can now check whether the decrypted file is the public key
    const publicKeyDownloadContent = await publicKeyDownload.createReadStream().then(readFromStream);
    const decryptedDownloadContent = await decryptedDownload.createReadStream().then(readFromStream);
    expect(decryptedDownloadContent).toBe(publicKeyDownloadContent);
});

function toAbbreviatedFileName(path: string): string {
    return path.split("/").findLast(() => true)?.slice(0, 8) + "...";
}

async function readFromStream(stream: Readable): Promise<string> {
    // Convert the stream into a string (file content)
    let fileContent = "";
    stream.on("data", (chunk) => {
        fileContent += chunk.toString(); // Append chunk as string
    });

    // Wait for stream to finish and return content when promise resolves
    return new Promise(resolve => stream.on("end", resolve)).then(() => fileContent);
}
