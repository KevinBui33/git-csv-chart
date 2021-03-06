const fs = require("fs");
const execProcess = require("./exec_process.js");
const ObjectsToCsv = require("objects-to-csv");

async function mainGit(repo, start_date, end_date) {
  console.log("Dir ----------");

  console.log("checking if repo has already been cloned locally ");
  let res = await execProcess.result(`git submodule add ${repo} cloned-repo`);

  if (res instanceof Error) {
    console.log("Git repo already in local folder");
  }

  console.log("Fetching repo");
  execProcess.result(`git -C ./cloned-repo fetch`);

  // Get all of the authors  (git -C ./cloned_repo shortlog -sne HEAD)
  console.log("getting authors names");
  let allAuthorsGit = await execProcess.result(
    `git -C ./cloned-repo shortlog -sne HEAD`
  );

  let allAuthors = [];

  allAuthorsGit
    .toString()
    .split("\n")
    .forEach((auth) => {
      const data = auth.split(/\s+/);
      allAuthors.push({
        name: data[2],
        email: data[data.length - 1]
          .toString()
          .replace("<", "")
          .replace(">", ""),
        commits: data[1],
      });
    });
  allAuthors.pop();

  console.log(allAuthors);

  // get the # of added or removed lines in they did (git log --author=Shing --pretty=tformat: --numstat)
  console.log("Getting author #add/remove");

  let allAuthorLogs = [];
  for (const auth of allAuthors) {
    let result = await execProcess.result(
      `git -C ./cloned-repo log --after=${start_date} --before=${end_date} --author=${auth.email} --pretty="%ad" --shortstat`
    );
    let stats = result
      .toString()
      .split("\n")
      .filter((e) => e);

    let logDate;
    for (let i = 0; i < stats.length; i += 1) {
      try {
        logDate = new Date(stats[i]).toISOString();
      } catch (err) {
        var add = 0,
          remove = 0;
        const authorLog = stats[i].split(",");

        if (authorLog.length == 2) {
          if (authorLog[1].includes("insertions(+)")) {
            add = authorLog[1].match(/\d+/g)[0];
          } else if (authorLog[1].includes("deletions(-)")) {
            remove = authorLog[1].match(/\d+/g)[0];
          }
        } else {
          add = authorLog[1].match(/\d+/g)[0];
          remove = authorLog[2].match(/\d+/g)[0];
        }

        allAuthorLogs.push({
          name: auth.name,
          email: auth.email,
          date: logDate,
          add: add,
          remove: remove,
        });
      }
    }
  }

  console.log("Final All Authors");
  console.log(allAuthorLogs);

  console.log("Making .csv");
  const csv = new ObjectsToCsv(allAuthorLogs);
  await csv.toDisk("./authorStats.csv");
  //   console.log(await csv.toString());
  console.log("Making .js file");
  fs.writeFileSync("./authorStats.js", `var csv = \`${await csv.toString()}\``);
}

mainGit(
  process.argv.slice(2)[0],
  process.argv.slice(3)[0],
  process.argv.slice(4)[0]
);
