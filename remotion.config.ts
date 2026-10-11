import { Config } from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
// Le grain de film est incompressible : CRF 22 garde la qualité visuelle pour ~15 Mo / 30 s.
Config.setCrf(22);
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);

// Navigateur personnalisé (ex. Chromium déjà installé) : REMOTION_BROWSER=/chemin/vers/chrome
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
