declare module '*.css' {
  const content: never;
  export default content;
}

interface Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}
