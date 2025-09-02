import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.hs-osnabrueck.threedplacer',
  appName: '3D-Placer',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      // For Android < 12 (legacy splash screens)
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      
      // For iOS
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      layoutName: "launch_screen",
    },
  },
};

export default config;
