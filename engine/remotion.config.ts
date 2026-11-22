// Render settings for this PC (Windows, Radeon 760M integrated GPU). Measured in the scratch-render project.
import path from "path";
import { Config } from "@remotion/cli/config";

// Keep Remotion's temporary files inside the project (engine/.remotion-tmp, ignored by git). Every render copies the
// public/ folder into a temp folder, which can quietly fill the system drive.
const tmp = path.join(process.cwd(), ".remotion-tmp");
process.env.TEMP = tmp;
process.env.TMP = tmp;

// three.js needs WebGL; "angle" makes WebGL work in Remotion's headless Chrome on Windows.
Config.setChromiumOpenGlRenderer("angle");
// Big 3D frames can take a while to load the first time.
Config.setDelayRenderTimeoutInMilliseconds(120000);
// Use the Chrome that is already installed instead of downloading Remotion's own browser.
Config.setBrowserExecutable("C:/Program Files/Google/Chrome/Application/chrome.exe");
// 1 browser tab is fastest here. 6 tabs were ~3x slower, and 2 tabs crashed Chrome once ("Target closed").
Config.setConcurrency(1);
