import { defineConfig, devices } from "@playwright/test";

const localDevUrl = "http://localhost:8080";
const teUrl = "https://whisper.te.syncorix.com";
const qaUrl = "https://whisper.qa.syncorix.com";
const liveUrl = "https://whisper.syncorix.com";

export default defineConfig({
    testDir: "./tests",
    reporter: "html",
    projects: [
        {
            name: "dev - chromium",
            use: { ...devices["Desktop Chrome"], channel: "chromium", baseURL: localDevUrl }
        },
        {
            name: "dev - firefox",
            use: { ...devices["Desktop Firefox"], baseURL: localDevUrl }
        },
        {
            name: "dev - webkit",
            use: { ...devices["Desktop Safari"], baseURL: localDevUrl }
        },
        {
            name: "te - chromium",
            use: { ...devices["Desktop Chrome"], channel: "chromium", baseURL: teUrl }
        },
        {
            name: "te - firefox",
            use: { ...devices["Desktop Firefox"], baseURL: teUrl }
        },
        {
            name: "te - webkit",
            use: { ...devices["Desktop Safari"], baseURL: teUrl }
        },
        {
            name: "qa - chromium",
            use: { ...devices["Desktop Chrome"], channel: "chromium", baseURL: qaUrl }
        },
        {
            name: "qa - firefox",
            use: { ...devices["Desktop Firefox"], baseURL: qaUrl }
        },
        {
            name: "qa - webkit",
            use: { ...devices["Desktop Safari"], baseURL: qaUrl }
        },
        {
            name: "live - chromium",
            use: { ...devices["Desktop Chrome"], channel: "chromium", baseURL: liveUrl }
        },
        {
            name: "live - firefox",
            use: { ...devices["Desktop Firefox"], baseURL: liveUrl }
        },
        {
            name: "live - webkit",
            use: { ...devices["Desktop Safari"], baseURL: liveUrl }
        }
    ]
});
