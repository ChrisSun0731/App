const { withAppBuildGradle } = require('expo/config-plugins');

const BEGIN = '// @generated begin ck-app-android-debug-identity';
const END = '// @generated end ck-app-android-debug-identity';
const DEBUG_IDENTITY = `${BEGIN}
android {
    buildTypes {
        debug {
            applicationIdSuffix '.dev'
            resValue 'string', 'app_name', 'CK APP Dev'
        }
    }
}
${END}`;

// Keep local debug installs separate from the signed store app and its data.
// A second android block configures the same Gradle extension without matching
// the generated project's nested debug/signingConfigs blocks.
module.exports = function withAndroidDebugIdentity(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      throw new Error('CK APP debug identity requires a Groovy app/build.gradle.');
    }

    const contents = modConfig.modResults.contents;
    const start = contents.indexOf(BEGIN);
    const end = contents.indexOf(END);

    if (start === -1 && end === -1) {
      modConfig.modResults.contents = `${contents.trimEnd()}\n\n${DEBUG_IDENTITY}\n`;
    } else if (start === -1 || end < start) {
      throw new Error('Incomplete CK APP debug identity block in app/build.gradle.');
    } else {
      modConfig.modResults.contents =
        contents.slice(0, start) + DEBUG_IDENTITY + contents.slice(end + END.length);
    }

    return modConfig;
  });
};
