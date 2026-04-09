import { firebaseAuth } from "../config/firebase.admin";
import readline from "readline";

//npm run delete:users:all

function printUsage() {
  console.log("Usage:");
  console.log("  npm run delete:users -- <uid1> <uid2> ...");
  console.log("  ts-node scripts/deleteUsers.ts <uid1> <uid2> ...");
  console.log("");
  console.log("Delete ALL users (irrevocable):");
  console.log("  npm run delete:users:all");
  console.log("  ts-node scripts/deleteUsers.ts --all [--force] [--dry-run]");
  console.log("");
  console.log("Env alternatives:");
  console.log("  UIDS=uid1,uid2,uid3  DELETE_ALL=true  FORCE=true  DRY_RUN=true");
}

async function fetchAllUids(): Promise<string[]> {
  const uids: string[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const page = await firebaseAuth.listUsers(1000, pageToken);
    uids.push(...page.users.map((u) => u.uid));
    pageToken = page.pageToken;
  } while (pageToken);
  return uids;
}

async function deleteInChunks(uids: string[]) {
  let totalSuccess = 0;
  let totalFailure = 0;
  const allErrors: any[] = [];

  for (let i = 0; i < uids.length; i += 1000) {
    const chunk = uids.slice(i, i + 1000);
    // eslint-disable-next-line no-await-in-loop
    const res = await firebaseAuth.deleteUsers(chunk);
    totalSuccess += res.successCount;
    totalFailure += res.failureCount;
    if (res.errors?.length) allErrors.push(...res.errors);
    console.log(`Processed ${Math.min(i + 1000, uids.length)}/${uids.length} users`);
  }

  console.log(`Successfully deleted ${totalSuccess} users`);
  console.log(`Failed to delete ${totalFailure} users`);
  if (allErrors.length) {
    allErrors.forEach((err) => console.log(JSON.stringify(err.error, null, 2)));
  }

  if (totalFailure > 0) process.exitCode = 2;
}

async function confirmDangerousAction(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${prompt} Type DELETE to confirm: `, (ans) => {
      rl.close();
      resolve(ans.trim().toUpperCase() === "DELETE");
    });
  });
}

async function main() {
  const args = process.argv.slice(2).filter(Boolean);
  const hasAllFlag = args.includes("--all") || String(process.env.DELETE_ALL).toLowerCase() === "true";
  const force = args.includes("--force") || args.includes("-f") || String(process.env.FORCE).toLowerCase() === "true" || process.env.CONFIRM === "YES";
  const dryRun = args.includes("--dry-run") || String(process.env.DRY_RUN).toLowerCase() === "true";

  const explicitUids = args.filter((a) => !a.startsWith("--"));
  const envUids = (process.env.UIDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const uids = explicitUids.length ? explicitUids : envUids;

  if (!uids.length && !hasAllFlag) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (hasAllFlag) {
    console.log("Listing all users in Firebase Auth...");
    const allUids = await fetchAllUids();
    console.log(`Found ${allUids.length} user(s) in the project.`);
    if (!allUids.length) return;
    if (dryRun) {
      console.log("--dry-run enabled: not deleting any users.");
      return;
    }
    if (!force) {
      const confirmed = await confirmDangerousAction("This will permanently delete ALL users.");
      if (!confirmed) {
        console.log("Aborted by user.");
        return;
      }
    }
    console.log("Deleting users in batches...");
    await deleteInChunks(allUids);
    return;
  }

  console.log(`About to delete ${uids.length} user(s). This is irreversible.`);
  try {
    await deleteInChunks(uids);
  } catch (error) {
    console.error("Error deleting users:", error);
    process.exitCode = 1;
  }
}

main();
