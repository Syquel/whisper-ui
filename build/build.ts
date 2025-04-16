// Build icons
import "./build-iconify";

// Build teh application
await Bun.build({
    outdir: "./bundle",
    entrypoints: ["./src/index.html"],
    minify: true
});

console.log("Build complete!");
