export interface PiperPhonemizeModule {
  callMain(args: string[]): number;
}
export function createPiperPhonemize(opts: {
  print?: (line: string) => void;
  printErr?: (line: string) => void;
  locateFile?: (file: string) => string;
}): Promise<PiperPhonemizeModule>;
