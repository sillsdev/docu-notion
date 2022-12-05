import chalk from "chalk";

type levels = "info" | "verbose" | "debug";
let logLevel: levels;
export function setLogLevel(l: levels): void {
  logLevel = l;
}
export function error(s: string | Error): void {
  console.error(chalk.red(s));
}
export function warning(s: string): void {
  console.log(chalk.hex("#FFA500")(s));
}
export function info(s: string): void {
  console.log(s);
}
export function heading(s: string): void {
  console.log(chalk.blue(s));
}
export function verbose(s: string): void {
  if (logLevel === "verbose" || logLevel === "debug")
    console.log(chalk.green(s));
}
export function logDebug(label: string, info: string): void {
  if (logLevel === "debug") {
    console.log(chalk.dim("[" + label + "]"));
    console.log(chalk.dim(info));
  }
}
