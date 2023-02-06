import chalk from "chalk";
chalk;
type levels = "info" | "verbose" | "debug";
let logLevel: levels;
export function setLogLevel(l: levels): void {
  logLevel = l;
}
export function error(s: string): void {
  console.error(chalk.red(wrapForCI(s, "error")));
}
export function warning(s: string): void {
  console.log(chalk.hex("#FFA500")(wrapForCI(s, "warning")));
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
    console.log(chalk.dim(wrapForCI(`[${label}]`, "debug")));
    console.log(chalk.dim(wrapForCI(info, "debug")));
  }
}

function wrapForCI(s: string, githubActionsPrefix: string): string {
  // for now, we only know about github actions, but submit a PR if you want to add more
  return process.env["GITHUB_ACTIONS"] === "true"
    ? `::${githubActionsPrefix}::${s}`
    : s;
}
